from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from datetime import datetime
import json
from sqlalchemy import func

from infrastructure import SessionLocal, init_db
from models import FraudAlert, AuditorAction
from agent9_precrime import PreCrimeAgent
from fastapi.responses import FileResponse
from agent7_coordinator import compute_shap_explanation, build_evidence_pdf, generate_str_json, BlockchainEvidenceChain
from agent8_deception import DeceptionGuard
import os
import pandas as pd

# Initialize FastAPI App
app = FastAPI(title="VaultMind 2.0 Command Center API")

# Setup CORS - Yeh tere React frontend ko block hone se bachayega
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hackathon ke liye all allow kar rahe hain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure DB tables exist on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Request Models
class FeedbackRequest(BaseModel):
    action: str  # "CONFIRM" or "FALSE_ALARM"

# ---------------------------------------------------------
# ENDPOINT 1: Top KPIs
# ---------------------------------------------------------
@app.get("/api/dashboard/kpis")
def get_kpis():
    db = SessionLocal()
    try:
        transactions_scanned = db.query(func.count(FraudAlert.id)).scalar() or 0
        critical_alerts = db.query(func.count(FraudAlert.id)).filter(FraudAlert.risk_score >= 80).scalar() or 0
        high_risk_flags = db.query(func.count(FraudAlert.id)).filter(
            FraudAlert.risk_score >= 60, FraudAlert.risk_score < 80
        ).scalar() or 0
        confirmed_fraud = db.query(func.count(FraudAlert.id)).filter(
            FraudAlert.auditor_status == "CONFIRMED"
        ).scalar() or 0
        avg_cbsi_score = db.query(func.avg(FraudAlert.risk_score)).scalar() or 0.0

        return {
            "transactions_scanned": transactions_scanned,
            "critical_alerts": critical_alerts,
            "high_risk_flags": high_risk_flags,
            "confirmed_fraud": confirmed_fraud,
            "avg_cbsi_score": round(float(avg_cbsi_score), 1)
        }
    finally:
        db.close()

# ---------------------------------------------------------
# ENDPOINT 2: Kafka Live Stream Simulation
# ---------------------------------------------------------
@app.get("/api/stream/kafka-sim")
def get_live_stream():
    db = SessionLocal()
    try:
        alerts = (
            db.query(FraudAlert)
            .order_by(FraudAlert.id.desc())
            .limit(20)
            .all()
        )
        result = []
        for alert in alerts:
            # Use stored timestamp if available, otherwise fallback to current time
            time_str = alert.timestamp.strftime("%H:%M:%S") if alert.timestamp else datetime.now().strftime("%H:%M:%S")
            result.append({
                "emp_id": alert.emp_id,
                "type": alert.action_type,
                "amount": alert.risk_score,  # Map risk_score as amount since no separate amount column
                "cbsi": alert.risk_score,
                "time": time_str
            })
        return result
    finally:
        db.close()

# ---------------------------------------------------------
# ENDPOINT 3: Agent 2 Graph Fund Flow
# ---------------------------------------------------------
@app.get("/api/graph/fundflow")
def get_graph_data():
    return {
        "nodes": [
            {"id": "EMP_1024", "label": "EMP_1024", "group": "critical"},
            {"id": "ACC_GHOST_99", "label": "ACC_GHOST_99", "group": "honeypot"},
            {"id": "EMP_1099", "label": "EMP_1099", "group": "watch"}
        ],
        "edges": [
            {"from": "EMP_1024", "to": "ACC_GHOST_99", "label": "Rs.50,00,000"}
        ]
    }

# ---------------------------------------------------------
# ENDPOINT 4: Glass-Box Explainability (Dynamic LLM Mock)
# ---------------------------------------------------------
@app.post("/api/explain/{emp_id}")
def generate_explanation(emp_id: str):
    db = SessionLocal()
    try:
        # Query the latest alert for the given employee
        alert = (
            db.query(FraudAlert)
            .filter(FraudAlert.emp_id == emp_id)
            .order_by(FraudAlert.id.desc())
            .first()
        )

        if not alert:
            return {"score": 0, "explanation": "No alerts found for this employee"}

        # Parse detection_reasons from JSON string
        try:
            detection_reasons = json.loads(alert.detection_reasons) if alert.detection_reasons else {}
        except (json.JSONDecodeError, TypeError):
            detection_reasons = {"raw": alert.detection_reasons}

        # Build agent_scores from detection_reasons signals
        agent_scores = {}
        if isinstance(detection_reasons, dict) and "signals" in detection_reasons:
            for signal in detection_reasons["signals"]:
                if signal.startswith("DeceptionGuard:"):
                    agent_scores["DeceptionGuard"] = 100
                elif signal.startswith("ProfileAudit:"):
                    agent_scores["ProfileAudit"] = 95
                elif signal.startswith("SentimentWatch:"):
                    agent_scores["SentimentWatch"] = 85

        return {
            "score": alert.risk_score,
            "detection_reasons": detection_reasons,
            "agent_scores": agent_scores,
            "explanation": f"VaultMind flagged {emp_id} with risk score {alert.risk_score}. "
                           f"Detection signals: {json.dumps(detection_reasons)}"
        }
    finally:
        db.close()

# ---------------------------------------------------------
# ENDPOINT 5: Human-in-the-Loop Feedback
# ---------------------------------------------------------
@app.post("/api/feedback/{emp_id}")
def submit_feedback(emp_id: str, feedback: FeedbackRequest):
    db = SessionLocal()
    try:
        # Update the latest alert's auditor_status
        alert = (
            db.query(FraudAlert)
            .filter(FraudAlert.emp_id == emp_id)
            .order_by(FraudAlert.id.desc())
            .first()
        )

        if alert:
            alert.auditor_status = "CONFIRMED" if feedback.action == "CONFIRM" else "DISMISSED"

        # Write audit log entry
        audit_log = AuditorAction(
            emp_id=emp_id,
            action=feedback.action,
            investigator_id="ANALYST_01"
        )
        db.add(audit_log)
        db.commit()

        if feedback.action == "CONFIRM":
            return {"status": "success", "message": f"Incident confirmed. Locking {emp_id} terminal and drafting FIU-STR."}
        else:
            return {"status": "success", "message": f"False alarm logged. Recalibrating AI baseline for {emp_id}."}
    finally:
        db.close()

# ---------------------------------------------------------
# ENDPOINT 6: PreCrime Forecast (Markov Chain)
# ---------------------------------------------------------
@app.get("/api/precrime/{emp_id}")
def get_precrime_forecast(emp_id: str):
    db = SessionLocal()
    try:
        # Query the last 10 risk_score values for the employee
        alerts = (
            db.query(FraudAlert.risk_score)
            .filter(FraudAlert.emp_id == emp_id)
            .order_by(FraudAlert.id.desc())
            .limit(10)
            .all()
        )
        # Reverse to get chronological order
        scores = [a.risk_score for a in alerts][::-1]
        
        agent = PreCrimeAgent()
        result = agent.predict(emp_id, scores)
        return result
    finally:
        db.close()

# ---------------------------------------------------------
# ENDPOINT 7: Evidence List
# ---------------------------------------------------------
@app.get("/api/evidence/list")
def list_evidence():
    pdf_dir = "evidence_output/pdf_reports"
    str_dir = "evidence_output/str_reports"
    evidence = []

    if not os.path.isdir(pdf_dir):
        return evidence

    db = SessionLocal()
    try:
        for filename in os.listdir(pdf_dir):
            if not filename.endswith(".pdf"):
                continue

            pdf_path = os.path.join(pdf_dir, filename)
            str_filename = filename.replace(".pdf", "_STR.json")
            str_path = os.path.join(str_dir, str_filename)

            file_stat = os.stat(pdf_path)

            alert_match = None
            parts = filename.replace(".pdf", "").split("_")
            if len(parts) >= 2:
                possible_emp_id = "_".join(parts[1:])
                alert_match = (
                    db.query(FraudAlert)
                    .filter(FraudAlert.emp_id == possible_emp_id)
                    .order_by(FraudAlert.id.desc())
                    .first()
                )

            item = {
                "filename": filename,
                "str_filename": str_filename if os.path.exists(str_path) else None,
                "file_size": file_stat.st_size,
                "last_modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                "sha256": None,
                "block_id": None,
                "block_hash": None,
                "emp_id": None,
                "risk_score": None,
                "auditor_status": None,
            }
            if alert_match:
                item["sha256"] = alert_match.data_hash_sha256
                item["block_id"] = alert_match.block_id
                item["block_hash"] = alert_match.block_hash_sha256
                item["emp_id"] = alert_match.emp_id
                item["risk_score"] = alert_match.risk_score
                item["auditor_status"] = alert_match.auditor_status
            evidence.append(item)

        return evidence
    finally:
        db.close()


# ---------------------------------------------------------
# ENDPOINT 8: Evidence Download
# ---------------------------------------------------------
@app.get("/api/evidence/download/{file_type}/{filename}")
def download_evidence(file_type: str, filename: str):
    dir_map = {
        "pdf": "evidence_output/pdf_reports",
        "str": "evidence_output/str_reports",
    }
    if file_type not in dir_map:
        return {"error": "Invalid file_type. Must be 'pdf' or 'str'."}

    file_path = os.path.join(dir_map[file_type], filename)
    if not os.path.isfile(file_path):
        return {"error": "File not found."}

    media_type = "application/pdf" if file_type == "pdf" else "application/json"
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ---------------------------------------------------------
# ENDPOINT 9: Generate Evidence Dossier
# ---------------------------------------------------------
class DossierRequest(BaseModel):
    risk_score: int = 95
    action_type: str = "SYSTEM_BULK_EXPORT"
    amount: float = 5000000
    emp_class: str = "CLERK"
    branch_id: str = "BR_01"
    login_hour: int = 3
    records_accessed: int = 52000
    dwell_time_seconds: float = 4.2
    off_hours_flag: int = 1

@app.post("/api/generate-dossier/{emp_id}")
def generate_dossier(emp_id: str, body: DossierRequest = None):
    if body is None:
        body = DossierRequest()

    db = SessionLocal()
    try:
        # Look for existing alert
        alert = (
            db.query(FraudAlert)
            .filter(FraudAlert.emp_id == emp_id)
            .order_by(FraudAlert.id.desc())
            .first()
        )

        # If no alert exists, create one via VaultMemory
        if not alert:
            from infrastructure import VaultMemory
            vault = VaultMemory()
            txn_id = f"TXN_{datetime.now().strftime('%Y%m%d%H%M%S')}_{emp_id.replace('_','')}"
            alert = vault.save_alert({
                "transaction_id": txn_id,
                "emp_id": emp_id,
                "risk_score": body.risk_score,
                "action_type": body.action_type,
                "detection_reasons": {
                    "amount": body.amount,
                    "emp_class": body.emp_class,
                    "branch_id": body.branch_id,
                    "login_hour": body.login_hour,
                    "records_accessed": body.records_accessed,
                    "dwell_time_seconds": body.dwell_time_seconds,
                    "off_hours_flag": body.off_hours_flag,
                    "source": "FIU Dossier Generation"
                }
            })

        # Build the alert_data dict for evidence generation
        now_str = datetime.now().strftime('%Y%m%d%H%M%S')
        alert_id = f"EVD-{now_str}"

        # Parse detection_reasons back
        try:
            reasons = json.loads(alert.detection_reasons) if alert.detection_reasons else {}
        except (json.JSONDecodeError, TypeError):
            reasons = {}

        alert_data = {
            "alert_id": alert_id,
            "transaction_id": alert.transaction_id,
            "emp_id": alert.emp_id,
            "action_type": alert.action_type,
            "risk_score": alert.risk_score,
            "is_fraud_flag": 1 if alert.risk_score >= 70 else 0,
            "timestamp": alert.timestamp.isoformat() if alert.timestamp else datetime.now().isoformat(),
            "amount": reasons.get("amount", alert.risk_score * 50000),
            "emp_class": reasons.get("emp_class", "CLERK"),
            "branch_id": reasons.get("branch_id", "BR_01"),
            "login_hour": reasons.get("login_hour", 3),
            "records_accessed": reasons.get("records_accessed", 52000),
            "dwell_time_seconds": reasons.get("dwell_time_seconds", 4.2),
            "off_hours_flag": reasons.get("off_hours_flag", 1),
        }

        shap_result = compute_shap_explanation(alert_data)

        os.makedirs("evidence_output/pdf_reports", exist_ok=True)
        os.makedirs("evidence_output/str_reports", exist_ok=True)
        os.makedirs("evidence_output/blockchain_chain", exist_ok=True)

        chain_file = "evidence_output/blockchain_chain/evidence_chain.json"
        blockchain = BlockchainEvidenceChain(chain_file)
        block = blockchain.add_block(alert_data["alert_id"], alert_data)

        pdf_filename = f"{alert_id}_{emp_id.replace('_', '')}.pdf"
        pdf_path = f"evidence_output/pdf_reports/{pdf_filename}"
        build_evidence_pdf(alert_data, shap_result, block, pdf_path)

        str_data = generate_str_json(alert_data, shap_result, block)
        str_filename = f"{alert_id}_STR.json"
        str_path = f"evidence_output/str_reports/{str_filename}"
        with open(str_path, "w") as f:
            json.dump(str_data, f, indent=2)

        return {
            "status": "success",
            "pdf_filename": pdf_filename,
            "str_filename": str_filename,
            "alert_id": alert_id,
            "emp_id": emp_id,
            "risk_score": shap_result["risk_score"],
            "block_id": block["block_id"],
            "block_hash": block["block_hash"],
        }
    finally:
        db.close()



# ---------------------------------------------------------
# ENDPOINT 10: Deception Guard Status
# ---------------------------------------------------------
@app.get("/api/deception/status")
def deception_status():
    guard = DeceptionGuard()
    db = SessionLocal()
    try:
        honey_balances = {
            "ACC-MIRAGE-001": 5000000, "ACC-MIRAGE-002": 3500000,
            "ACC-MIRAGE-003": 12000000, "ACC-MIRAGE-004": 7800000,
            "ACC-MIRAGE-005": 2500000, "ACC-MIRAGE-006": 800000,
            "ACC-MIRAGE-007": 8000000, "ACC-MIRAGE-008": 4200000,
            "ACC-MIRAGE-009": 1500000, "ACC-MIRAGE-010": 25000000,
        }
        accounts = []
        for mirage_id, meta in guard.mirage_db.items():
            breach_alert = (
                db.query(FraudAlert)
                .filter(FraudAlert.detection_reasons.contains("DeceptionGuard"))
                .filter(FraudAlert.detection_reasons.contains(mirage_id))
                .first()
            )
            breach_detected = breach_alert is not None
            threat_origin = "-"
            if breach_alert:
                threat_origin = f"{breach_alert.emp_id} | IP: 192.168.1.{hash(breach_alert.emp_id) % 255} ({meta['department']})"

            accounts.append({
                "account_id": mirage_id,
                "risk_level": meta["risk_level"],
                "department": meta["department"],
                "balance": honey_balances.get(mirage_id, 1000000),
                "status": "BREACH DETECTED" if breach_detected else ("Decoy credential deployed" if meta["risk_level"] == "High" else "Monitoring for lookup"),
                "threat_origin": threat_origin,
                "breach_detected": breach_detected,
            })

        total = len(accounts)
        breached = sum(1 for a in accounts if a["breach_detected"])

        return {
            "total_honeypots": total,
            "breaches_detected": breached,
            "integrity_rate": round((total - breached) / total * 100, 1) if total else 100.0,
            "accounts": accounts,
        }
    finally:
        db.close()


# ---------------------------------------------------------
# ENDPOINT 11: Deception Guard Test
# ---------------------------------------------------------
@app.post("/api/deception/test/{account_id}")
def test_deception(account_id: str):
    guard = DeceptionGuard()
    result = guard.evaluate_access(account_id)
    return result
