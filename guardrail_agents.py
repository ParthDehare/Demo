"""
VaultMind 2.0 - guardrail_agents.py
===================================================================
Guardrail Agents: Agents 3, 5 & 6
Contains deterministic, high-speed rule engines for:
- Agent 3: TemporalGuard (Velocity and Rate Limiting)
- Agent 5: ProfileAudit (Role-Based Access Control)
- Agent 6: RegulatoryAI (Compliance & Financial Limits)

These agents return a standard tuple: (score, reason) 
for seamless integration with Agent 7 (Master Evidence Builder).
===================================================================
"""

import time
from datetime import datetime

class TemporalGuard:
    """Agent 3: Monitors transaction velocity to detect robotic or rapid-fire actions."""
    
    def __init__(self):
        # Simulating an in-memory cache (like Redis)
        # Structure: { emp_id: [(timestamp1), (timestamp2), ...] }
        self._request_cache = {}
        self.time_window_seconds = 60  # Monitor hits within a 60-second window
        self.max_hits_allowed = 5      # More than 5 hits in 60 seconds is suspicious

    def check_velocity(self, emp_id: str, transaction_timestamp: str = None) -> tuple:
        """
        Simulates checking a cache to see if the employee is making too many requests.
        Returns (score, reason).
        """
        if not transaction_timestamp:
            current_time = time.time()
        else:
            # Parse timestamp if provided (e.g. '2025-10-01 08:00:25')
            try:
                dt = datetime.strptime(transaction_timestamp, '%Y-%m-%d %H:%M:%S')
                current_time = dt.timestamp()
            except ValueError:
                current_time = time.time()

        if emp_id not in self._request_cache:
            self._request_cache[emp_id] = []
            
        # Add current request
        self._request_cache[emp_id].append(current_time)
        
        # Clean up old requests outside the time window
        valid_hits = [t for t in self._request_cache[emp_id] if (current_time - t) <= self.time_window_seconds]
        self._request_cache[emp_id] = valid_hits
        
        hit_count = len(valid_hits)
        
        if hit_count > self.max_hits_allowed:
            score = min(100.0, 50.0 + (hit_count - self.max_hits_allowed) * 10)
            reason = f"Velocity Breach: {hit_count} actions detected within {self.time_window_seconds}s window."
            return (score, reason)
            
        return (0.0, "Velocity normal.")


class ProfileAudit:
    def __init__(self):
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        # Sabhi roles ki limits .env se uthao
        self.limits = {
            'CLERK': float(os.getenv("CLERK_LIMIT", 5000000.0)),
            'MANAGER': float(os.getenv("MANAGER_LIMIT", 50000000.0)),
            'ADMIN': float(os.getenv("ADMIN_LIMIT", 500000000.0)),
            'IT_ADMIN': float(os.getenv("IT_ADMIN_LIMIT", 0.0))
        }
        self.sensitive_actions = ['SYSTEM_BULK_EXPORT', 'DB_GRANT_ACCESS', 'SYSTEM_CONFIG_CHANGE']

    def audit_profile(self, emp_class: str, action_type: str, amount: float) -> tuple:
        amount = float(amount)
        role = emp_class.upper()
        
        # Dynamic check for ANY role limit
        if role in self.limits:
            role_limit = self.limits[role]
            if amount > role_limit:
                # IT_ADMIN ke liye special message kyunki unki limit 0 hai
                if role == 'IT_ADMIN':
                    return (90.0, f"Profile Audit Breach: IT_ADMIN (Role not for financial transfers) attempted ₹{amount:,.2f}.")
                return (85.0, f"Profile Breach: {role} limit of ₹{role_limit:,.0f} exceeded (Attempted: ₹{amount:,.2f}).")
            
        # Logic 2: Restricted System Actions check
        if role not in ['IT_ADMIN', 'ADMIN'] and action_type in self.sensitive_actions:
            return (95.0, f"Privilege Escalation: {role} attempted restricted system action '{action_type}'.")

        return (0.0, "Profile audit passed.")

class RegulatoryAI:
    """Agent 6: Hard checks against regulatory thresholds and channel limits."""
    
    def __init__(self):
        # Transaction limits in INR
        self.channel_limits = {
            'UPI': 200000.0,         # 2 Lakh
            'IMPS': 500000.0,        # 5 Lakh
            'NEFT': 1000000.0,       # 10 Lakh (Typical standard limit for instant without approvals)
            'RTGS': 100000000.0      # 10 Crore
        }

    def check_compliance(self, amount: float, transfer_channel: str) -> tuple:
        """
        Validates the transaction against hard regulatory limits for the specific channel.
        Returns (score, reason).
        """
        amount = float(amount)
        channel = transfer_channel.upper()
        
        # If channel has a strict limit
        if channel in self.channel_limits:
            limit = self.channel_limits[channel]
            if amount > limit:
                return (100.0, f"Regulatory Breach: {channel} transaction of Rs.{amount:,.2f} exceeds hard limit of Rs.{limit:,.2f}.")
                
        # Structuring check: amount just below the standard 50k STR (Suspicious Transaction Report) limit
        if 49000 <= amount <= 49999:
            return (60.0, f"Compliance Warning: Transaction amount Rs.{amount:,.2f} suggests potential structuring (just below 50k STR limit).")
            
        return (0.0, "Compliance checks passed.")


# ==========================================================================
# TEST HARNESS
# ==========================================================================
if __name__ == "__main__":
    print("="*65)
    print(" VaultMind 2.0 - Guardrail Agents Initialized")
    print("="*65)
    
    agent3 = TemporalGuard()
    agent5 = ProfileAudit()
    agent6 = RegulatoryAI()
    
    print("\n--- Testing Agent 3: TemporalGuard ---")
    emp = "EMP_1234"
    print("Simulating 6 rapid requests...")
    for i in range(6):
        score, reason = agent3.check_velocity(emp, "2026-05-13 10:00:00")
    print(f"Result: Score {score} | Reason: {reason}")
    
    print("\n--- Testing Agent 5: ProfileAudit ---")
    test_cases_a5 = [
        ("CLERK", "Initiate", 6000000),             # Exceeds Clerk limit
        ("CLERK", "SYSTEM_BULK_EXPORT", 0),         # Privilege Escalation
        ("IT_ADMIN", "DB_Read", 50000),             # IT moving money
        ("MANAGER", "Approve", 100000)              # Normal
    ]
    for role, action, amt in test_cases_a5:
        score, reason = agent5.audit_profile(role, action, amt)
        print(f"[{role} doing {action} for {amt}] -> Score: {score} | {reason}")

    print("\n--- Testing Agent 6: RegulatoryAI ---")
    test_cases_a6 = [
        (300000, "UPI"),          # Exceeds UPI 2L
        (150000000, "RTGS"),      # Exceeds RTGS 10Cr
        (49500, "NEFT"),          # Structuring warning
        (50000, "IMPS")           # Normal
    ]
    for amt, channel in test_cases_a6:
        score, reason = agent6.check_compliance(amt, channel)
        print(f"[{channel} for {amt}] -> Score: {score} | {reason}")
        
    print("\n" + "="*65)
