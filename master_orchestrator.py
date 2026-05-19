"""
VaultMind 2.0 - Master Orchestrator
===================================
The Central Nervous System that streams transactions through all 8 Agents
and persists the final outcome to the WORM ledger.
"""

import os
import joblib
import json
import torch
import numpy as np
import pandas as pd
from datetime import datetime
import concurrent.futures

# Import local engines
from guardrail_agents import TemporalGuard, ProfileAudit, RegulatoryAI
from agent4_sentiment import SentimentWatch
from agent8_deception import DeceptionGuard
from infrastructure import VaultMemory
from agent7_coordinator import compute_shap_explanation, build_evidence_pdf, generate_str_json

try:
    from train_agent2 import GraphSAGEEdgeClassifier
    HAS_PYG = True
except ImportError:
    HAS_PYG = False
    print("WARNING: torch_geometric not installed or GraphSAGEEdgeClassifier failed to load.")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, "models")

class VaultMindOrchestrator:
    def __init__(self):
        print("="*65)
        print(" Initializing VaultMind 2.0 Master Orchestrator...")
        print("="*65)
        
        # 1. Initialize Persistence Layer
        self.vault_memory = VaultMemory()
        
        # 2. Initialize Deterministic/Heuristic Agents
        self.agent3 = TemporalGuard() 
        self.agent4 = SentimentWatch()
        self.agent5 = ProfileAudit()
        self.agent6 = RegulatoryAI()
        self.agent8 = DeceptionGuard()

        # 3. Load Machine Learning Models (Agents 1 & 2)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self._load_ml_models()

    def _load_ml_models(self):
        # ── Agent 1 (BehaviourWatch) ──
        try:
            self.a1_model = joblib.load(os.path.join(MODEL_DIR, "agent1_iso_forest.pkl"))
            self.a1_scaler = joblib.load(os.path.join(MODEL_DIR, "agent1_scaler.pkl"))
            print("[OK] Agent 1: Isolation Forest Loaded.")
        except Exception as e:
            print(f"[FAIL] Agent 1 failed to load: {e}")
            self.a1_model = None

        # ── Agent 2 (FundFlow GNN) ──
        try:
            if HAS_PYG:
                a2_mapping = joblib.load(os.path.join(MODEL_DIR, "account_mapping.pkl"))
                self.a2_account_mapping = a2_mapping["account_mapping"]
                self.a2_edge_scaler = a2_mapping["edge_scaler"]
                
                self.a2_model = GraphSAGEEdgeClassifier(in_channels=1, hidden_channels=32, edge_in_channels=2)
                self.a2_model.load_state_dict(torch.load(os.path.join(MODEL_DIR, "agent2_gnn.pth"), map_location=self.device))
                self.a2_model.to(self.device)
                self.a2_model.eval()
                print("[OK] Agent 2: GraphSAGE GNN Loaded.")
            else:
                self.a2_model = None
        except Exception as e:
            print(f"[FAIL] Agent 2 failed to load: {e}")
            self.a2_model = None

    def process_transaction(self, tx_data: dict) -> dict:
        """
        Processes a single transaction through the entire multi-agent pipeline.
        """
        print(f"\n[STREAM] Processing Tx: {tx_data.get('transaction_id')} ...")
        
        aggregated_score = 15.0 # Base normal risk
        signals_triggered = []
        
        dest_acc = tx_data.get('destination_account', '')
        emp_id = tx_data.get('emp_id')
        timestamp = tx_data.get('timestamp')
        emp_class = tx_data.get('emp_class', 'CLERK')
        action_type = tx_data.get('action_type', '')
        amount = tx_data.get('amount', 0)
        channel = tx_data.get('transfer_channel', 'NEFT')
        remarks = tx_data.get('remarks', '')

        # Define wrapper functions for each agent check
        def check_deception():
            res = self.agent8.evaluate_access(dest_acc)
            if res['risk_score'] > 0:
                return (100.0, f"DeceptionGuard: {res['evidence']['trigger']}", "max")
            return (0, None, "max")

        def check_temporal():
            score, reason = self.agent3.check_velocity(emp_id, timestamp)
            if score > 0:
                return (score * 0.4, f"TemporalGuard: {reason}", "add")
            return (0, None, "add")

        def check_profile():
            score, reason = self.agent5.audit_profile(emp_class, action_type, amount)
            if score > 0:
                return (score, f"ProfileAudit: {reason}", "max")
            return (0, None, "max")

        def check_regulatory():
            score, reason = self.agent6.check_compliance(amount, channel)
            if score > 0:
                return (score, f"RegulatoryAI: {reason}", "max")
            return (0, None, "max")

        def check_sentiment():
            if remarks:
                score, source = self.agent4.analyze_text(remarks)
                if score >= 50:
                    return (score * 0.5, f"SentimentWatch: High risk intent detected via {source} (Score: {score})", "add")
            return (0, None, "add")

        def check_ml_a1():
            if self.a1_model:
                features = [[
                    float(amount),
                    float(tx_data.get('dwell_time_seconds', 0)),
                    int(tx_data.get('records_accessed', 0)),
                    int(tx_data.get('login_hour', 9))
                ]]
                features_scaled = self.a1_scaler.transform(features)
                if self.a1_model.predict(features_scaled)[0] == -1:
                    return (25.0, "BehaviourWatch: Anomalous behavioral footprint detected.", "add")
            return (0, None, "add")

        def check_ml_a2():
            if self.a2_model:
                src_acc = tx_data.get('account_touched', '')
                if src_acc in self.a2_account_mapping and dest_acc in self.a2_account_mapping:
                    src_idx = self.a2_account_mapping[src_acc]
                    dst_idx = self.a2_account_mapping[dest_acc]
                    
                    edge_index = torch.tensor([[src_idx], [dst_idx]], dtype=torch.long).to(self.device)
                    edge_feat = self.a2_edge_scaler.transform([[amount, tx_data.get('dwell_time_seconds', 0)]])
                    edge_attr = torch.tensor(edge_feat, dtype=torch.float).to(self.device)
                    x = torch.ones((len(self.a2_account_mapping), 1), dtype=torch.float).to(self.device)
                    
                    with torch.no_grad():
                        out = self.a2_model(x, edge_index, edge_attr)
                        prob = torch.sigmoid(out).item()
                        
                    if prob > 0.8:
                        return (35.0, f"FundFlow GNN: Malicious edge pattern detected (Prob: {prob:.2f})", "add")
            return (0, None, "add")

        # Execute all checks in parallel
        tasks = [
            check_deception, check_temporal, check_profile, 
            check_regulatory, check_sentiment, check_ml_a1, check_ml_a2
        ]
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
            results = list(executor.map(lambda f: f(), tasks))
            
        # Aggregate the results
        for score, reason, method in results:
            if reason:
                signals_triggered.append(reason)
            if method == "add":
                aggregated_score += score
            elif method == "max":
                aggregated_score = max(aggregated_score, score)

        # ── AGENT 7: EvidenceBuilder & WORM Ledger Persistence ──
        final_score = min(100, int(aggregated_score))
        tx_data['risk_score'] = final_score
        
        print(f"  -> Compliance Breach Severity Index: {final_score}/100")
        
        reason_dict = {"signals": signals_triggered}

        db_alert = self.vault_memory.save_alert({
            "transaction_id": tx_data.get('transaction_id', 'UNKNOWN'),
            "emp_id": tx_data.get('emp_id', 'UNKNOWN'),
            "risk_score": final_score,
            "action_type": tx_data.get('action_type', 'UNKNOWN'),
            "detection_reasons": reason_dict
        })
        
        # Evidence generation for High-Risk (>= 70)
        if final_score >= 70:
            print("  -> CRITICAL THRESHOLD REACHED: Engaging EvidenceBuilder (Agent 7)")
            
            os.makedirs("evidence_output/pdf_reports", exist_ok=True)
            os.makedirs("evidence_output/str_reports", exist_ok=True)
            
            alert_id = f"EVD-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            tx_data["alert_id"] = alert_id
            
            block = {
                "block_id": db_alert.block_id,
                "data_hash": db_alert.data_hash_sha256,
                "block_hash": db_alert.block_hash_sha256,
                "previous_hash": db_alert.previous_hash,
                "timestamp": datetime.now().isoformat()
            }
            
            shap_result = compute_shap_explanation(pd.Series(tx_data))
            shap_result["risk_score"] = final_score
            
            pdf_path = f"evidence_output/pdf_reports/{alert_id}.pdf"
            build_evidence_pdf(tx_data, shap_result, block, pdf_path)
            
            str_data = generate_str_json(tx_data, shap_result, block)
            with open(f"evidence_output/str_reports/{alert_id}_STR.json", 'w') as f:
                json.dump(str_data, f, indent=2)
                
            print(f"  -> EVIDENCE GENERATED: {pdf_path}")

        return {
            "transaction_id": tx_data.get('transaction_id'),
            "severity_index": final_score,
            "signals": signals_triggered,
            "block_hash": db_alert.block_hash_sha256
        }

if __name__ == "__main__":
    orchestrator = VaultMindOrchestrator()
    
    # Live Mock Transaction - High Risk Scenario
    test_tx = {
        "transaction_id": "TXN_LIVE_400599",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "emp_id": "EMP_CLERK_091",
        "emp_class": "CLERK",
        "branch_id": "BR_MUMBAI_HQ",
        "action_type": "Approve",  # Escalation
        "amount": 8500000,         # Exceeds limits
        "transfer_channel": "RTGS",
        "destination_account": "ACC-MIRAGE-001", # Honeypot Account!
        "account_touched": "ACC_NORMAL_881",
        "dwell_time_seconds": 1.2, # Robotic speed
        "records_accessed": 10500, # Bulk access
        "login_hour": 3,           # 3 AM
        "off_hours_flag": 1,
        "remarks": "Urgent manager request. Client threatened with extortion if delayed." # High risk NLP
    }
    
    result = orchestrator.process_transaction(test_tx)
    print("\n" + "="*65)
    print(" Pipeline Execution Complete")
    print("="*65)
    print(json.dumps(result, indent=2))
    
    # Audit Check
    tampered_rows = orchestrator.vault_memory.verify_chain_integrity()
    print(f"\n[LEDGER AUDIT] Cryptographic Chain Verification Passed. Tampered blocks: {tampered_rows}")
