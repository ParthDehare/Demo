"""
VaultMind 2.0 - Persistence Layer (Infrastructure)
Implements the database engine connection, WORM storage principles, 
cryptographic ledger logic, and velocity caching for high-speed transaction checks.
"""

import hashlib
import json
import time
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, FraudAlert

# Database configuration
# Using SQLite for local demo. Replace with PostgreSQL URL for production.
# Example: "postgresql://user:password@localhost/vaultmind_db"
DATABASE_URL = "sqlite:///vaultmind_ledger.db"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    """Initializes the database schema if tables do not exist."""
    Base.metadata.create_all(bind=engine)

class VelocityCache:
    """
    Agent 3: Velocity Cache
    A simple dictionary-based TTL (Time-To-Live) cache to track rapid-fire
    transactions. Falls back to expiring records organically upon retrieval/insertion.
    """
    def __init__(self, ttl_seconds: int = 60):
        self.cache = {}
        self.ttl = ttl_seconds

    def _cleanup(self):
        """Removes expired entries from the cache."""
        now = time.time()
        expired_keys = [k for k, v in self.cache.items() if v['expires'] < now]
        for k in expired_keys:
            del self.cache[k]

    def incr_velocity(self, emp_id: str):
        """Increments the transaction count for a given employee ID."""
        self._cleanup()
        now = time.time()
        if emp_id in self.cache:
            self.cache[emp_id]['count'] += 1
        else:
            self.cache[emp_id] = {'count': 1, 'expires': now + self.ttl}

    def get_velocity(self, emp_id: str) -> int:
        """Retrieves the current transaction count for a given employee ID."""
        self._cleanup()
        return self.cache.get(emp_id, {}).get('count', 0)


class VaultMemory:
    """
    The Engine: Centralized Data Access Layer for VaultMind 2.0.
    Handles cryptographic hashing, retention policies, and chain integrity verification.
    """
    def __init__(self):
        init_db()
        self.session = SessionLocal()
        # Initializing velocity cache with a 1-hour TTL (3600 seconds)
        self.velocity = VelocityCache(ttl_seconds=3600)

    def _hash_data(self, data: str) -> str:
        """Utility function to generate SHA-256 hash."""
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

    def save_alert(self, alert_data: dict) -> FraudAlert:
        """
        Saves a transaction alert into the database, securing it with a cryptographic
        ledger system similar to blockchain.
        
        Expected keys in alert_data:
        - transaction_id (str)
        - emp_id (str)
        - risk_score (int)
        - action_type (str)
        - detection_reasons (dict or str)
        """
        # 1. Fetch the previous block to link the chain
        last_alert = self.session.query(FraudAlert).order_by(FraudAlert.id.desc()).first()
        
        previous_hash = last_alert.block_hash_sha256 if last_alert else "GENESIS_BLOCK"
        block_id = (last_alert.block_id + 1) if last_alert else 1

        # 2. Determine Retention Expiry Date based on risk score
        score = alert_data.get('risk_score', 0)
        now = datetime.utcnow()
        if score < 40:
            expiry_date = now + timedelta(days=90)
        elif score < 70:
            expiry_date = now + timedelta(days=365) # 1 year
        else:
            expiry_date = now + timedelta(days=365 * 5) # 5 years

        # 3. Cryptographic Proofing
        reasons = alert_data.get('detection_reasons', {})
        reasons_json = json.dumps(reasons, sort_keys=True) if isinstance(reasons, dict) else str(reasons)
        
        # Hashing core data
        data_string = f"{alert_data.get('transaction_id')}|{alert_data.get('emp_id')}|{score}|{alert_data.get('action_type')}|{reasons_json}"
        data_hash = self._hash_data(data_string)

        # Hashing block header (Current Data Hash + Previous Block Hash)
        block_hash = self._hash_data(f"{data_hash}|{previous_hash}")

        # 4. Commit to Database
        new_alert = FraudAlert(
            transaction_id=alert_data.get('transaction_id'),
            emp_id=alert_data.get('emp_id'),
            risk_score=score,
            action_type=alert_data.get('action_type'),
            detection_reasons=reasons_json,
            block_id=block_id,
            data_hash_sha256=data_hash,
            block_hash_sha256=block_hash,
            previous_hash=previous_hash,
            retention_expiry_date=expiry_date
            # auditor_status automatically defaults to "PENDING"
            # is_tampered automatically defaults to False
        )

        self.session.add(new_alert)
        self.session.commit()
        self.session.refresh(new_alert)
        
        # Optionally, increase velocity count whenever an alert gets processed
        self.velocity.incr_velocity(new_alert.emp_id)
        
        return new_alert

    def verify_chain_integrity(self) -> int:
        """
        Cryptographic Audit: Iterates through the entire ledger to verify 
        hashes. Flags any rows that have been tampered with.
        
        Returns the number of tampered records discovered.
        """
        alerts = self.session.query(FraudAlert).order_by(FraudAlert.id.asc()).all()
        
        expected_previous_hash = "GENESIS_BLOCK"
        tampered_count = 0

        for alert in alerts:
            is_valid = True

            # Step A: Validate the chain link (Does the previous_hash match the actual previous block?)
            if alert.previous_hash != expected_previous_hash:
                is_valid = False

            # Step B: Validate data integrity (Has the core data or internal hash been tampered?)
            data_string = f"{alert.transaction_id}|{alert.emp_id}|{alert.risk_score}|{alert.action_type}|{alert.detection_reasons}"
            calculated_data_hash = self._hash_data(data_string)
            calculated_block_hash = self._hash_data(f"{calculated_data_hash}|{alert.previous_hash}")
            
            if alert.data_hash_sha256 != calculated_data_hash or alert.block_hash_sha256 != calculated_block_hash:
                is_valid = False

            # Flag the row if tampered
            if not is_valid and not alert.is_tampered:
                alert.is_tampered = True
                tampered_count += 1

            # Prepare for the next block
            expected_previous_hash = alert.block_hash_sha256

        # Commit changes if tampered rows were flagged
        if tampered_count > 0:
            self.session.commit()
            
        return tampered_count
