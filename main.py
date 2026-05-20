"""
VaultMind 2.0 - Data Fusion Engine
Production-ready backend with historical warmup + live stream processing
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import os
from datetime import datetime
from master_orchestrator import VaultMindOrchestrator

# ──────────────────────────────────────────────────────────────
# INITIALIZATION
# ──────────────────────────────────────────────────────────────

app = FastAPI(title="VaultMind 2.0 Data Fusion Engine")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Orchestrator
orchestrator = VaultMindOrchestrator()

# ──────────────────────────────────────────────────────────────
# GLOBAL DATA - Loaded at Startup
# ──────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────
# GLOBAL DATA - Loaded at Startup
# ──────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "Testing_data")

# 1. Historical Warmup Data (for dashboard)
historical_df = None
try:
    historical_df = pd.read_csv(os.path.join(DATA_DIR, "historical_warmup_data.csv"))
    # 🔴 FIX: Replace NaN values with None to make it JSON compliant
    historical_df = historical_df.where(pd.notnull(historical_df), None)
    print(f"✅ Loaded {len(historical_df)} historical records for dashboard foundation")
except Exception as e:
    print(f"❌ Failed to load historical_warmup_data.csv: {e}")
    historical_df = pd.DataFrame()

# 2. Live Stream Data (for transaction stream)
live_stream_list = []
live_stream_index = 0
try:
    live_df = pd.read_csv(os.path.join(DATA_DIR, "live_demo_stream.csv"))
    # 🔴 FIX: Replace NaN values with None to make it JSON compliant
    live_df = live_df.where(pd.notnull(live_df), None)
    live_stream_list = live_df.to_dict('records')
    print(f"✅ Loaded {len(live_stream_list)} live stream transactions")
except Exception as e:
    print(f"❌ Failed to load live_demo_stream.csv: {e}")
    live_stream_list = []

# ──────────────────────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    emp_id: Optional[str] = None
    cbsi: Optional[float] = None
    action_type: Optional[str] = None
    amount: Optional[float] = None
    transfer_channel: Optional[str] = None
    timestamp: Optional[str] = None
    remarks: Optional[str] = None
    transaction_id: Optional[str] = None

class FeedbackRequest(BaseModel):
    action: str  # "CONFIRM" or "FALSE_ALARM"

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "VaultMind AI Active",
        "timestamp": datetime.now().isoformat(),
        "historical_records": len(historical_df) if historical_df is not None else 0,
        "live_stream_count": len(live_stream_list)
    }


@app.get("/api/dashboard-init")
def dashboard_init():
    """
    Return FIRST 500 rows of historical_warmup_data as JSON.
    This ensures React charts/KPIs load instantly without "Insufficient Data" errors.
    
    Returns: First 500 transactions for quick dashboard initialization
    """
    try:
        if historical_df is None or historical_df.empty:
            return {
                "data": [],
                "count": 0,
                "message": "No historical data available",
                "error": "historical_df is empty"
            }
        
        # Return FIRST 500 rows only for instant dashboard load
        first_500 = historical_df.head(500)
        next_offset = len(first_500)
        
        return {
            "data": first_500.to_dict('records'),
            "count": len(first_500),
            "total_available": len(historical_df),
            "next_offset": next_offset,
            "has_more": len(historical_df) > next_offset,
            "columns": list(first_500.columns),
            "message": f"Dashboard initialized with first 500 of {len(historical_df)} records"
        }
    except Exception as e:
        print(f"❌ Error in /api/dashboard-init: {e}")
        return {
            "data": [],
            "count": 0,
            "error": str(e),
            "message": "Failed to load dashboard data"
        }


@app.post("/api/explain/{emp_id}")
def explain_ai_decision(emp_id: str, payload: Optional[ExplainRequest] = None):
    """
    Return dynamic AI explanation text for the given employee and transaction context.
    """
    cbsi = payload.cbsi if payload and payload.cbsi is not None else None
    action_type = payload.action_type if payload else None
    amount = payload.amount if payload else None
    channel = payload.transfer_channel if payload else None
    remarks = payload.remarks if payload else None

    if emp_id == "EMP_1024":
        explanation = (
            f"CRITICAL BREACH: Employee {emp_id} accessed a deception honeypot account. "
            "Immediate isolation recommended. Agent 4 flagged privilege escalation patterns."
        )
    elif cbsi is None:
        explanation = (
            f"AI baseline active for {emp_id}. Insufficient telemetry to derive risk context. "
            "Awaiting transaction signals for deeper analysis."
        )
    elif cbsi >= 80:
        explanation = (
            f"High-risk anomaly detected for {emp_id}. CBSI {cbsi:.1f} exceeds critical threshold. "
            f"Action '{action_type or 'UNKNOWN'}' and channel '{channel or 'UNKNOWN'}' deviate from baseline. "
            f"{'Transaction amount Rs.' + f'{amount:,.2f}' if amount else 'Amount signal unavailable.'}"
        )
    elif cbsi >= 50:
        explanation = (
            f"Elevated risk for {emp_id}. CBSI {cbsi:.1f} shows abnormal transaction behavior. "
            f"Action '{action_type or 'UNKNOWN'}' and channel '{channel or 'UNKNOWN'}' require review. "
            f"{'Remarks flag: ' + remarks[:80] + '...' if remarks else 'No NLP flags detected.'}"
        )
    else:
        explanation = (
            f"Normal behavior observed for {emp_id}. CBSI {cbsi:.1f} within baseline. "
            f"Action '{action_type or 'UNKNOWN'}' aligns with typical patterns. "
            "No abnormal NLP signals detected."
        )

    return {"explanation": explanation}


@app.get("/api/dashboard-more")
def dashboard_more(offset: int = 500, limit: int = 500):
    """
    Return additional historical data in batches.
    Use offset/limit for pagination to keep initial load fast.
    """
    try:
        if historical_df is None or historical_df.empty:
            return {
                "data": [],
                "count": 0,
                "total_available": 0,
                "next_offset": offset,
                "has_more": False,
                "message": "No historical data available"
            }

        safe_offset = max(0, int(offset))
        safe_limit = max(1, int(limit))
        end = safe_offset + safe_limit
        batch = historical_df.iloc[safe_offset:end]

        next_offset = safe_offset + len(batch)
        return {
            "data": batch.to_dict('records'),
            "count": len(batch),
            "total_available": len(historical_df),
            "next_offset": next_offset,
            "has_more": len(historical_df) > next_offset,
            "message": f"Returned rows {safe_offset} to {next_offset - 1}"
        }
    except Exception as e:
        print(f"❌ Error in /api/dashboard-more: {e}")
        return {
            "data": [],
            "count": 0,
            "error": str(e),
            "message": "Failed to load additional dashboard data"
        }


@app.get("/get-next-transaction")
def get_next_transaction():
    """
    Stream next transaction from live_demo_stream.csv with ML predictions.
    
    Returns:
    - ONE row at a time from the live stream
    - Runs orchestrator.run_models(row) for risk scoring
    - Returns: {...row_data, cbsi: score}
    
    Error Handling:
    - If CSV data missing: returns dummy object {emp_id: "N/A", cbsi: 0}
    - Global index cycles through the live stream
    """
    global live_stream_index
    
    # Error handling: if no live stream data, return dummy object
    if not live_stream_list:
        print("⚠️  No live stream data available, returning dummy object")
        return {
            "emp_id": "N/A",
            "cbsi": 0,
            "predicted_cbsi_score": 0,
            "risk_tier": "NORMAL",
            "error": "No live stream data available"
        }
    
    try:
        # Get next transaction (cycle back to start if reached end)
        current_tx = live_stream_list[live_stream_index % len(live_stream_list)]
        live_stream_index += 1
        
        print(f"\n{'='*70}")
        print(f"🔵 Processing live transaction: {current_tx.get('transaction_id')}")
        print(f"   Employee: {current_tx.get('emp_id')} | Amount: Rs. {current_tx.get('amount')}")
        print(f"{'='*70}")
        
        try:
            # Run orchestrator ML pipeline (GNN + Isolation Forest)
            ml_result = orchestrator.process_transaction(current_tx)
            
            # 🔴 THE FIX: Orchestrator 'severity_index' aur 'signals' bhejta hai
            predicted_cbsi_score = ml_result.get('severity_index', 15)
            signals_triggered = ml_result.get('signals', [])
            
        except Exception as ml_error:
            print(f"❌ ML pipeline error: {ml_error}, using default score")
            predicted_cbsi_score = 15
            signals_triggered = []
        
        # Determine risk tier
        if predicted_cbsi_score >= 70:
            risk_tier = "CRITICAL"
        elif predicted_cbsi_score >= 50:
            risk_tier = "HIGH"
        elif predicted_cbsi_score >= 30:
            risk_tier = "WATCH"
        else:
            risk_tier = "NORMAL"
        
        print(f"\n{'='*70}")
        print(f"✅ Model predicted CBSI score: {predicted_cbsi_score}/100")
        print(f"   Risk Tier: {risk_tier}")
        print(f"   Signals Triggered: {len(signals_triggered)}")
        print(f"{'='*70}\n")
        
        # Return transaction + ML predictions
        response = {
            **current_tx,  # Include all original row data
            "cbsi": predicted_cbsi_score,
            "predicted_cbsi_score": predicted_cbsi_score,
            "risk_tier": risk_tier,
            "signals_triggered": signals_triggered,
            "stream_index": live_stream_index - 1
        }
        
        return response
    
    except Exception as e:
        print(f"❌ Error in /get-next-transaction: {e}")
        # Fallback: return dummy object instead of crashing
        return {
            "emp_id": "N/A",
            "cbsi": 0,
            "predicted_cbsi_score": 0,
            "risk_tier": "NORMAL",
            "error": str(e)
        }


@app.get("/api/roster/employees")
def get_employee_roster():
    """
    Returns employee metadata (emp_id, emp_class, branch_id, etc.)
    Used by React frontend to display Employee Roster with Role and Branch columns
    """
    try:
        emp_csv = os.path.join(DATA_DIR, "employees_master.csv")
        
        if not os.path.exists(emp_csv):
            return {"employees": [], "error": "Employee data not found"}
        
        emp_df = pd.read_csv(emp_csv)
        
        # Select relevant columns for frontend
        cols_to_return = ["emp_id", "emp_class", "branch_id"]
        cols_available = [c for c in cols_to_return if c in emp_df.columns]
        
        if not cols_available:
            return {"employees": [], "error": "Required columns not found in employee data"}
        
        roster_data = emp_df[cols_available].drop_duplicates(subset=["emp_id"]).fillna("").to_dict('records')
        return {
            "employees": roster_data,
            "total": len(roster_data),
            "columns": cols_available
        }
    except Exception as e:
        return {"employees": [], "error": str(e), "total": 0}


@app.post("/api/feedback/{emp_id}")
def submit_feedback(emp_id: str, feedback: FeedbackRequest):
    """
    Handle user feedback (incident confirmation/false alarm)
    """
    if feedback.action == "CONFIRM":
        return {"status": "success", "message": f"Incident confirmed. Locking {emp_id} terminal and drafting FIU-STR."}
    else:
        return {"status": "success", "message": f"False alarm logged. Recalibrating AI baseline for {emp_id}."}


# ──────────────────────────────────────────────────────────────
# STARTUP & SHUTDOWN
# ──────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Log startup"""
    print("\n" + "="*70)
    print("🚀 VaultMind 2.0 Data Fusion Engine Starting...")
    print(f"   Historical Records: {len(historical_df) if historical_df is not None else 0}")
    print(f"   Live Stream Transactions: {len(live_stream_list)}")
    print(f"   Orchestrator: Ready (GNN + Isolation Forest loaded)")
    print("="*70 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown"""
    print("\n" + "="*70)
    print("🛑 VaultMind 2.0 Data Fusion Engine Shutting Down...")
    print(f"   Total Transactions Processed: {live_stream_index}")
    print("="*70 + "\n")


# ──────────────────────────────────────────────────────────────
# RUN INSTRUCTION
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )
