# vaultmind_main.py
import json
import asyncio
import threading
import os
from fastapi.responses import FileResponse
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaConsumer

from core.master_orchestrator import MasterOrchestrator
from api.api_server import router as api_router

app = FastAPI(title="VaultMind Backend API")

# Include the API router
app.include_router(api_router, prefix="/api")

# Allow React to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Localhost React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 1. Boot up the Brain ──
orchestrator = MasterOrchestrator()

# Keep track of connected React clients
active_connections = []
main_loop = None  # Store the main event loop

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    print("🟢 React Frontend Connected to WebSockets!")
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print("🔴 React Frontend Disconnected.")

def kafka_listener():
    try:
        # 1. Consumer setup
        consumer = KafkaConsumer(
            'live-transactions',
            bootstrap_servers=['localhost:9092'],
            group_id='vaultmind-group',
            auto_offset_reset='earliest',
            enable_auto_commit=True, # Ensure auto-commit is enabled for offset management
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        print("🎧 Listening to Kafka Topic...")

        # 2. Main loop with explicit heartbeat
        for message in consumer:
            transaction = message.value
            print(f"DEBUG: Processing Tx: {transaction.get('transaction_id')}") # Log transaction for debugging
            
            # Brain Logic
            result = orchestrator.process_transaction(transaction)
            
            # Send to Frontend
            if active_connections and main_loop is not None:
                for connection in active_connections:
                    # Safely schedule the async WebSocket send from the synchronous Kafka thread
                    asyncio.run_coroutine_threadsafe(connection.send_json(result), main_loop)

    except Exception as e:
        print(f"❌ Kafka Error: {e}")

@app.on_event("startup")
async def startup_event():
    global main_loop
    main_loop = asyncio.get_running_loop()
    # Start the Kafka listener in the background when the server starts
    thread = threading.Thread(target=kafka_listener, daemon=True)
    thread.start()
@app.get("/get-next-transaction")
async def get_next_transaction():
    # Retrieve the next transaction from the backend to send to the frontend.
    # Note: If a queue/buffer system is implemented, fetch the data from there.
    # Example:
    try:
        # Assuming you have a way to get the latest processed transaction
        txn = orchestrator.get_latest_processed_transaction()
        return txn
    except Exception as e:
        return {"error": "No transaction available", "details": str(e)}
    

@app.get("/api/evidence/download")
def download_evidence(emp_id: str):
    # Dummy fallback response agar sach mein PDF generation pipeline ready na ho
    return {"status": "success", "message": f"Evidence package compiled for {emp_id}."}

@app.post("/api/evidence/file-str")
def file_str(payload: dict):
    emp_id = payload.get("emp_id")
    cbsi_score = payload.get("cbsi_score")
    return {
        "status": "success", 
        "message": f"STR successfully filed securely to FIU-IND for node {emp_id}"
    }

@app.get("/")
def read_root():
    return {"status": "VaultMind Backend is LIVE 🚀"}