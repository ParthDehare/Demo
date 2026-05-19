"""
VaultMind 2.0 - Schema Synthesizer v2.0
Fixes: device_fingerprint | peer_cluster restored | watchlist_tag |
       label-leak patched | transfer_channel propagated
Input : Testing_data/{historical_warmup_data.csv, live_demo_stream.csv, employees_master.csv}
Output: Training_data/{employees.csv, login_logs.csv, transactions.csv, access_logs.csv}
"""

import os, uuid, random, hashlib
import numpy as np
import pandas as pd
from faker import Faker
from collections import defaultdict

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
fake = Faker("en_IN")
fake.seed_instance(SEED)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.join(BASE_DIR, "Testing_data")
OUT_DIR    = os.path.join(BASE_DIR, "Training_data")

DEST_ACCOUNT_POOL    = [f"ACC_{100 + i}" for i in range(500)]   # ACC_100 … ACC_599
VPN_ANOMALY_RATE     = 0.03
NOTICE_PERIOD_RATE   = 0.05

BENIGN_COMPLAINTS = [
    "Customer requested KYC update.",
    "Account holder inquired about FD rates.",
    "Complaint regarding delay in NEFT credit.",
    "Customer requested cheque book.",
    "Service request for mobile banking registration.",
    "Request for account statement for visa application.",
    "Customer asked about locker facility availability.",
]

# ── Load ──────────────────────────────────────────────────────────────────────

def load_sources() -> tuple[pd.DataFrame, pd.DataFrame]:
    paths = [os.path.join(SOURCE_DIR, f) for f in
             ["historical_warmup_data.csv", "live_demo_stream.csv"]]
    frames = []
    for p in paths:
        df = pd.read_csv(p, parse_dates=["timestamp"])
        frames.append(df)
        print(f"    {len(df):>7,} rows <- {os.path.basename(p)}")
    combined = pd.concat(frames, ignore_index=True).sort_values("timestamp").reset_index(drop=True)

    emp_master = pd.read_csv(os.path.join(SOURCE_DIR, "employees_master.csv"))
    print(f"    {len(emp_master):>7,} rows <- employees_master.csv")
    print(f"    Combined: {len(combined):,} rows | Fraud: {combined['is_fraud_flag'].sum()} "
          f"({combined['is_fraud_flag'].mean()*100:.2f}%)")
    return combined, emp_master

# ── Step 1: login_logs ────────────────────────────────────────────────────────

def build_login_logs(df: pd.DataFrame,
                     emp_master: pd.DataFrame) -> tuple[pd.DataFrame, dict, dict, dict]:
    login_df = df[df["action_type"] == "System_Login"].copy().reset_index(drop=True)
    rng = np.random.default_rng(SEED)

    login_df["session_id"]     = [str(uuid.uuid4()) for _ in range(len(login_df))]
    login_df["vpn_proxy_flag"] = (rng.random(len(login_df)) < VPN_ANOMALY_RATE).astype(int)
    login_df["user_agent"]     = [fake.user_agent() for _ in range(len(login_df))]

    # ── Device fingerprints: each employee has 1-3 stable devices ────────────
    emp_devices: dict[str, list[str]] = {}
    for emp_id in emp_master["emp_id"].unique():
        n_dev = random.choice([1, 1, 1, 2, 2, 3])
        emp_devices[emp_id] = [
            hashlib.sha256(f"{emp_id}-dev{i}-{fake.mac_address()}".encode()).hexdigest()[:16]
            for i in range(n_dev)
        ]

    login_df["device_fingerprint"] = login_df["emp_id"].apply(
        lambda eid: random.choice(emp_devices.get(eid, [hashlib.sha256(eid.encode()).hexdigest()[:16]]))
    )

    # ── Build relational lookup dicts ─────────────────────────────────────────
    emp_to_sessions: dict[str, list[str]] = defaultdict(list)
    session_to_ip:   dict[str, str]       = {}
    session_to_fp:   dict[str, str]       = {}

    for _, row in login_df.iterrows():
        emp_to_sessions[row["emp_id"]].append(row["session_id"])
        session_to_ip[row["session_id"]] = row["ip_address"]
        session_to_fp[row["session_id"]] = row["device_fingerprint"]

    out = login_df[[
        "timestamp", "emp_id", "emp_class", "branch_id",
        "session_id", "ip_address", "vpn_proxy_flag", "user_agent",
        "device_fingerprint", "is_fraud_flag",
    ]].copy()

    return out, dict(emp_to_sessions), session_to_ip, session_to_fp

# ── Step 2: transactions ──────────────────────────────────────────────────────

def build_transactions(df: pd.DataFrame,
                       emp_to_sessions: dict,
                       session_to_ip:   dict) -> pd.DataFrame:
    txn_df = df[df["action_type"] != "System_Login"].copy().reset_index(drop=True)

    def resolve_session(emp_id):
        s = emp_to_sessions.get(emp_id, [])
        return random.choice(s) if s else str(uuid.uuid4())

    txn_df["session_id"] = txn_df["emp_id"].apply(resolve_session)
    txn_df["ip_address"] = txn_df.apply(
        lambda r: session_to_ip.get(r["session_id"], r["ip_address"]), axis=1)

    txn_df["destination_account"] = [random.choice(DEST_ACCOUNT_POOL) for _ in range(len(txn_df))]

    # ── FIX: complaint injection — benign ONLY for normal rows ────────────────
    # Fraud rows already carry their text from data_generator; leave them intact.
    # Normal rows with empty text: inject benign text for ~5%
    complaint_col = txn_df["raw_complaint_text"].fillna("").tolist()
    normal_empty_idx = txn_df[
        (txn_df["is_fraud_flag"] == 0) &
        (txn_df["raw_complaint_text"].fillna("") == "")
    ].index.tolist()
    n_inject  = max(1, int(len(normal_empty_idx) * 0.05))
    inject_at = random.sample(normal_empty_idx, min(n_inject, len(normal_empty_idx)))
    for idx in inject_at:
        loc = txn_df.index.get_loc(idx)
        complaint_col[loc] = random.choice(BENIGN_COMPLAINTS)
    txn_df["raw_complaint_text"] = complaint_col

    # ── watchlist_tag: flag destination accounts touched in fraud txns ────────
    fraud_dest_accounts = set(
        txn_df.loc[txn_df["is_fraud_flag"] == 1, "destination_account"].unique()
    )
    txn_df["dest_account_watchlisted"] = txn_df["destination_account"].isin(
        fraud_dest_accounts).astype(int)

    out = txn_df[[
        "timestamp", "transaction_id", "emp_id", "emp_class", "branch_id",
        "action_type", "amount", "account_touched", "destination_account",
        "transfer_channel", "session_id", "ip_address",
        "raw_complaint_text", "hr_remark_text",
        "dest_account_watchlisted", "is_fraud_flag",
    ]].copy()

    return out

# ── Step 3: access_logs ───────────────────────────────────────────────────────

def build_access_logs(df: pd.DataFrame, emp_to_sessions: dict) -> pd.DataFrame:
    access_mask = df["action_type"].isin(["DB_Read", "Approve", "Initiate", "ATM_Withdrawal"])
    access_df   = df[access_mask].copy().reset_index(drop=True)

    def resolve_session(emp_id):
        s = emp_to_sessions.get(emp_id, [])
        return random.choice(s) if s else str(uuid.uuid4())

    access_df["session_id"]  = access_df["emp_id"].apply(resolve_session)
    access_df                = access_df.sort_values(["emp_id", "timestamp"])
    access_df["sequence_id"] = access_df.groupby("emp_id").cumcount() + 1
    access_df                = access_df.sort_values("timestamp").reset_index(drop=True)

    return access_df[[
        "timestamp", "emp_id", "emp_class", "branch_id",
        "action_type", "transfer_channel", "account_touched", "amount",
        "session_id", "sequence_id", "ip_address", "is_fraud_flag",
    ]].copy()

# ── Step 4: employees ─────────────────────────────────────────────────────────

def build_employees(emp_master: pd.DataFrame) -> pd.DataFrame:
    rng = np.random.default_rng(SEED + 2)
    n   = len(emp_master)
    df  = emp_master[["emp_id", "emp_class", "branch_id", "peer_cluster"]].copy()
    df["is_on_notice_period"] = (rng.random(n) < NOTICE_PERIOD_RATE).astype(int)
    df["performance_score"]   = np.round(rng.uniform(1.0, 5.0, size=n), 2)
    return df[["emp_id", "emp_class", "branch_id", "peer_cluster",
               "is_on_notice_period", "performance_score"]]

# ── Validation ────────────────────────────────────────────────────────────────

def validate(login_logs, transactions, access_logs, employees, emp_to_sessions):
    print("\n  Relational integrity checks:")

    known_sessions = set(login_logs["session_id"].unique())
    mapped_emps    = set(emp_to_sessions.keys())

    # emp_id cross-table
    assert set(transactions["emp_id"].unique()).issubset(set(employees["emp_id"].unique())), \
        "Orphan emp_ids in transactions"
    print("    [OK] All transaction emp_ids exist in employees")

    # session linkage — transactions
    mapped_txn     = transactions[transactions["emp_id"].isin(mapped_emps)]
    orphan_sess    = set(mapped_txn["session_id"].unique()) - known_sessions
    assert len(orphan_sess) == 0, f"{len(orphan_sess)} orphan sessions in transactions"
    print("    [OK] All transaction session_ids traceable to login_logs")

    # session linkage — access_logs
    mapped_acc     = access_logs[access_logs["emp_id"].isin(mapped_emps)]
    orphan_acc     = set(mapped_acc["session_id"].unique()) - known_sessions
    assert len(orphan_acc) == 0, f"{len(orphan_acc)} orphan sessions in access_logs"
    print("    [OK] All access_log session_ids traceable to login_logs")

    # dest account pool
    assert set(transactions["destination_account"]).issubset(set(DEST_ACCOUNT_POOL)), \
        "destination_account outside 500-pool"
    print(f"    [OK] Destination accounts in 500-pool "
          f"(used: {transactions['destination_account'].nunique()}/500)")

    # device_fingerprint present
    assert "device_fingerprint" in login_logs.columns, "device_fingerprint missing"
    print(f"    [OK] device_fingerprint present "
          f"({login_logs['device_fingerprint'].nunique()} unique fingerprints)")

    # peer_cluster in employees
    assert "peer_cluster" in employees.columns, "peer_cluster missing"
    print(f"    [OK] peer_cluster present "
          f"(clusters: {employees['peer_cluster'].nunique()})")

    # watchlist_tag
    wl = transactions["dest_account_watchlisted"].sum()
    print(f"    [OK] dest_account_watchlisted: {wl} rows flagged "
          f"({wl/len(transactions)*100:.2f}%)")

    # NLP label leak — must be ZERO
    normal_text = transactions[transactions["is_fraud_flag"] == 0]["raw_complaint_text"].fillna("")
    leak = normal_text.str.contains("fraud|bribe|unauthorized|suspicious", case=False).sum()
    assert leak == 0, f"LABEL LEAK: {leak} fraud keywords in normal rows!"
    print(f"    [OK] NLP label leak: 0 fraud keywords in normal rows")

    # notice period
    n_notice = employees["is_on_notice_period"].sum()
    print(f"    [OK] Notice-period employees: {n_notice} ({n_notice/len(employees)*100:.1f}%)")

    # sequence_id
    assert (access_logs["sequence_id"] >= 1).all(), "sequence_id < 1 found"
    print(f"    [OK] sequence_id valid (max: {access_logs['sequence_id'].max()})")

    print("\n  All checks passed.\n")

# ── Save ──────────────────────────────────────────────────────────────────────

def save_all(login_logs, transactions, access_logs, employees):
    os.makedirs(OUT_DIR, exist_ok=True)
    tables = {
        "employees.csv":    employees,
        "login_logs.csv":   login_logs,
        "transactions.csv": transactions,
        "access_logs.csv":  access_logs,
    }
    print(f"  Saving to: {OUT_DIR}\n")
    print(f"  {'File':<25} {'Rows':>8}  {'Cols':>5}  {'Fraud%':>7}  {'Size':>9}")
    print(f"  {'-'*57}")
    for fname, tbl in tables.items():
        path = os.path.join(OUT_DIR, fname)
        tbl.to_csv(path, index=False)
        fraud_pct = (f"{tbl['is_fraud_flag'].mean()*100:.2f}%"
                     if "is_fraud_flag" in tbl.columns else "  N/A")
        size_kb   = os.path.getsize(path) / 1024
        print(f"  {fname:<25} {len(tbl):>8,}  {len(tbl.columns):>5}  "
              f"{fraud_pct:>7}  {size_kb:>7.1f}KB")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    sep = "=" * 65
    print(f"\n{sep}")
    print("  VaultMind 2.0 - Schema Synthesizer v2.0")
    print(f"{sep}")

    print("\n[0/5] Loading source data...")
    df, emp_master = load_sources()

    print("\n[1/5] Building login_logs + session/fingerprint maps...")
    login_logs, emp_to_sessions, session_to_ip, session_to_fp = build_login_logs(df, emp_master)
    print(f"      Rows: {len(login_logs):,} | Sessions: {login_logs['session_id'].nunique():,} | "
          f"VPN flags: {login_logs['vpn_proxy_flag'].sum()} | "
          f"Fingerprints: {login_logs['device_fingerprint'].nunique()}")

    print("\n[2/5] Building transactions (graph edges)...")
    transactions = build_transactions(df, emp_to_sessions, session_to_ip)
    print(f"      Rows: {len(transactions):,} | "
          f"Dest accounts: {transactions['destination_account'].nunique()}/500 | "
          f"Watchlisted: {transactions['dest_account_watchlisted'].sum()} | "
          f"With complaint: {(transactions['raw_complaint_text'].fillna('')!='').sum()}")

    print("\n[3/5] Building access_logs (workflow chains)...")
    access_logs = build_access_logs(df, emp_to_sessions)
    print(f"      Rows: {len(access_logs):,} | "
          f"Employees: {access_logs['emp_id'].nunique()} | "
          f"Max sequence_id: {access_logs['sequence_id'].max()}")

    print("\n[4/5] Building employees master...")
    employees = build_employees(emp_master)
    print(f"      Employees: {len(employees)} | "
          f"On notice: {employees['is_on_notice_period'].sum()} | "
          f"Peer clusters: {employees['peer_cluster'].nunique()} | "
          f"Avg perf: {employees['performance_score'].mean():.2f}")

    print("\n[5/5] Validating & saving...")
    validate(login_logs, transactions, access_logs, employees, emp_to_sessions)
    save_all(login_logs, transactions, access_logs, employees)

    print(f"\n{sep}")
    print("  FINAL SCHEMA — AGENT READINESS")
    print(f"{sep}")
    print("  employees.csv    -> emp_id | emp_class | branch_id | peer_cluster |")
    print("                      is_on_notice_period | performance_score")
    print("  login_logs.csv   -> session_id* | vpn_proxy_flag | user_agent |")
    print("                      device_fingerprint  [Agent 2 GNN edge]")
    print("  transactions.csv -> session_id* | destination_account (500-pool) |")
    print("                      transfer_channel | dest_account_watchlisted |")
    print("                      raw_complaint_text | hr_remark_text")
    print("                      [Agent 1/2/4/6 signals]")
    print("  access_logs.csv  -> session_id* | sequence_id | transfer_channel")
    print("                      [Agent 1 velocity chain]")
    print(f"\n  * session_id links all 3 event tables to login_logs anchor")
    print(f"{sep}\n")

if __name__ == "__main__":
    main()
