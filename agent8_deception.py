"""
VaultMind 2.0 - agent8_deception.py
===================================================================
Agent 8: DeceptionGuard - Honeypot Monitoring
High-speed lookup script that monitors access to "Mirage" accounts.
Any access to these decoy accounts instantly triggers a critical
fraud alert with maximum risk score.

Features:
- Fast O(1) dictionary lookups for honeypot accounts
- Graceful handling of missing database file
- Returns full metadata (risk_level, department) for forensics
===================================================================
"""

import os
import csv
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MIRAGE_CSV_PATH = os.path.join(SCRIPT_DIR, "mirage_accounts.csv")

class DeceptionGuard:
    def __init__(self, csv_path: str = MIRAGE_CSV_PATH):
        self.csv_path = csv_path
        # Dictionary for O(1) fast lookup: mirage_id -> metadata
        self.mirage_db = {}
        self._load_database()

    def _load_database(self):
        """Loads the mirage accounts into a fast-lookup dictionary.
           Gracefully handles the case where the file is missing."""
        if not os.path.exists(self.csv_path):
            print(f"[DeceptionGuard] WARNING: Mirage database not found at {self.csv_path}")
            print("[DeceptionGuard] Creating a default mirage_accounts.csv for testing...")
            self._create_default_database()

        try:
            with open(self.csv_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    mid = row.get("mirage_id")
                    if mid:
                        self.mirage_db[mid] = {
                            "risk_level": row.get("risk_level", "Unknown"),
                            "department": row.get("department", "Unknown")
                        }
            print(f"[DeceptionGuard] Loaded {len(self.mirage_db)} mirage accounts into active memory.")
        except Exception as e:
            print(f"[DeceptionGuard] ERROR loading database: {e}")

    def _create_default_database(self):
        """Creates a dummy CSV if one does not exist."""
        default_accounts = [
            {"mirage_id": "ACC-MIRAGE-001", "risk_level": "Critical", "department": "Executive Board"},
            {"mirage_id": "ACC-MIRAGE-002", "risk_level": "High", "department": "IT Infrastructure"},
            {"mirage_id": "ACC-MIRAGE-003", "risk_level": "Critical", "department": "Wealth Management"},
            {"mirage_id": "ACC-MIRAGE-004", "risk_level": "High", "department": "Corporate Treasury"},
            {"mirage_id": "ACC-MIRAGE-005", "risk_level": "Critical", "department": "Compliance Strategy"},
            {"mirage_id": "ACC-MIRAGE-006", "risk_level": "Medium", "department": "General Ledgers"},
            {"mirage_id": "ACC-MIRAGE-007", "risk_level": "Critical", "department": "Special Operations"},
            {"mirage_id": "ACC-MIRAGE-008", "risk_level": "High", "department": "HR Payroll Conf"},
            {"mirage_id": "ACC-MIRAGE-009", "risk_level": "Medium", "department": "Retail Operations"},
            {"mirage_id": "ACC-MIRAGE-010", "risk_level": "Critical", "department": "Master Vault"}
        ]
        try:
            with open(self.csv_path, mode='w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=["mirage_id", "risk_level", "department"])
                writer.writeheader()
                writer.writerows(default_accounts)
        except Exception as e:
            print(f"[DeceptionGuard] Failed to create default database: {e}")

    def evaluate_access(self, account_id: str) -> dict:
        """
        Evaluates an account access attempt.
        
        Args:
            account_id (str): The ID of the account being accessed.
            
        Returns:
            dict: Evaluation result including risk_score, label, and metadata.
        """
        if account_id in self.mirage_db:
            metadata = self.mirage_db[account_id]
            return {
                "account_id": account_id,
                "risk_score": 100.0,
                "label": "CRITICAL_HONEYPOT_BREACH",
                "evidence": {
                    "risk_level": metadata["risk_level"],
                    "department": metadata["department"],
                    "trigger": "Direct interaction with a known DeceptionGuard Mirage Account."
                }
            }
        else:
            return {
                "account_id": account_id,
                "risk_score": 0.0,
                "label": "NORMAL",
                "evidence": None
            }

# ==========================================================================
# TEST HARNESS
# ==========================================================================
if __name__ == "__main__":
    print("="*65)
    print(" VaultMind 2.0 - Agent 8 (DeceptionGuard) Initialized")
    print("="*65)
    
    agent = DeceptionGuard()
    
    test_accounts = [
        "ACC_1092",            # Normal account
        "ACC-MIRAGE-007",      # Honeypot account
        "ACC_9999",            # Normal account
        "ACC-MIRAGE-001",      # Honeypot account
        "ACC-MIRAGE-009"       # Honeypot account
    ]
    
    print("\n--- Running Evaluations ---")
    for acc in test_accounts:
        result = agent.evaluate_access(acc)
        
        status = "[BREACH!]" if result["risk_score"] == 100 else "[SAFE]"
        print(f"\nAccount: {acc} {status}")
        print(f"  Score: {result['risk_score']}")
        print(f"  Label: {result['label']}")
        if result["evidence"]:
            print(f"  Evidence:")
            print(f"    - Dept: {result['evidence']['department']}")
            print(f"    - Risk: {result['evidence']['risk_level']}")
            print(f"    - Note: {result['evidence']['trigger']}")
    
    print("\n" + "="*65)
