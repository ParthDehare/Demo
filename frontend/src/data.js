// VaultMind 2.0 — Data Layer with Live API Integration
// Generates synthetic fallback data & provides async fetch functions
// that pull real data from the FastAPI backend at localhost:8000

const API_BASE = "http://localhost:8000";

// ─── Fallback: Synthetic Employee & Transaction Generation ────
const EMPLOYEES = Array.from({ length: 500 }, (_, i) => {
  const id = `EMP_${1000 + i}`;
  const roles = ["CLERK", "MANAGER", "IT_ADMIN"];
  const role = roles[i % 3 === 0 ? 2 : i % 5 === 0 ? 1 : 0];
  const branch = `BR_${String((i % 20) + 1).padStart(2, "0")}`;
  // 5% of employees are marked as potential fraudsters
  const isFraudster = Math.random() < 0.05;
  return { emp_id: id, emp_class: role, branch_id: branch, isFraudster };
});

const ACTIONS = ["Initiate", "Approve", "DB_Read", "System_Login", "ATM_Withdrawal", "SYSTEM_BULK_EXPORT"];
const CHANNELS = ["UPI", "IMPS", "NEFT", "RTGS", "SYSTEM", "ATM"];
const FRAUD_TEXTS = [
  "Customer reported unauthorized debit and extortion threat.",
  "ALERT: Bulk export of 50000 customer records to external IP.",
  "Suspected money laundering via shell accounts.",
  "Forged manager signature on approval documents.",
  "Employee bribe allegation from whistleblower.",
];

const SENTIMENT_KEYWORDS = [
  /\bstolen\b/i, /\bbribe\b/i, /\bhacked\b/i, /\bextortion\b/i,
  /\bunauthorized\b/i, /\billegal\b/i, /\bthreat\b/i,
  /\bfraud\b/i, /\bmoney.?launder/i, /\bforged?\b/i,
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateTransactions(count, startDate, endDate) {
  const txns = [];
  for (let i = 0; i < count; i++) {
    const emp = EMPLOYEES[Math.floor(Math.random() * EMPLOYEES.length)];
    // Only fraudsters commit high-risk transactions
    const isFraud = emp.isFraudster ? Math.random() < 0.025 : false;
    
    let action = ACTIONS[Math.floor(Math.random() * (ACTIONS.length - 1))];
    let channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
    let amount = Math.round(Math.random() * 45000); // 0 to 45k (safe)
    
    if (!isFraud) {
       if (emp.emp_class === "CLERK" && action === "Approve") action = "Initiate";
       if (emp.emp_class === "IT_ADMIN") amount = 0;
       if (!["IT_ADMIN", "ADMIN"].includes(emp.emp_class) && ["SYSTEM_BULK_EXPORT", "DB_GRANT_ACCESS"].includes(action)) {
           action = "DB_Read";
       }
    } else {
       action = Math.random() > 0.5 ? "SYSTEM_BULK_EXPORT" : action;
       amount = Math.round(Math.random() * 9000000 + 1000000);
    }

    // Force off-hours only for fraudsters
    let ts = randomDate(startDate, endDate);
    if (!isFraud) {
       // ensure hour is between 8 and 20
       ts.setHours(8 + Math.floor(Math.random() * 12));
    } else if (Math.random() < 0.3) {
       // off-hours
       ts.setHours(2 + Math.floor(Math.random() * 4));
    }

    const text = isFraud && Math.random() < 0.4 ? FRAUD_TEXTS[Math.floor(Math.random() * FRAUD_TEXTS.length)] : "";

    txns.push({
      transaction_id: `TXN_${Date.now()}_${i}`,
      timestamp: ts.toISOString(),
      emp_id: emp.emp_id,
      emp_class: emp.emp_class,
      branch_id: emp.branch_id,
      action_type: action,
      amount,
      account_touched: `ACC_${Math.floor(Math.random() * 8000 + 1000)}`,
      transfer_channel: channel,
      raw_complaint_text: text,
      is_fraud_flag: isFraud ? 1 : 0,
    });
  }
  return txns.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Scoring engine replicating Agents 3-6
function scoreTransaction(tx) {
  let score = 15;
  const amt = tx?.amount || 0;
  const role = (tx?.emp_class || "").toUpperCase();
  const action = tx?.action_type || "";
  const channel = (tx?.transfer_channel || "").toUpperCase();
  const text = tx?.raw_complaint_text || "";

  // Agent 5: ProfileAudit
  if (role === "CLERK" && amt > 5000000) score = Math.max(score, 85);
  if (!["IT_ADMIN", "ADMIN"].includes(role) && ["SYSTEM_BULK_EXPORT", "DB_GRANT_ACCESS"].includes(action))
    score = Math.max(score, 95);
  if (role === "IT_ADMIN" && amt > 0) score = Math.max(score, 90);
  if (role === "CLERK" && action === "Approve") score += 25;

  // Agent 6: RegulatoryAI
  const limits = { UPI: 200000, IMPS: 500000, NEFT: 1000000, RTGS: 100000000 };
  if (limits[channel] && amt > limits[channel]) score = Math.max(score, 100);
  if (amt >= 49000 && amt <= 49999) score = Math.max(score, 60);

  // Agent 4: NLP
  if (text) {
    for (const pat of SENTIMENT_KEYWORDS) {
      if (pat.test(text)) { score += 25; break; }
    }
  }

  // Off-hours
  try {
    const hour = new Date(tx?.timestamp).getHours();
    if (hour < 7 || hour > 21) score += 12;
  } catch {}

  // Fraud flag boost
  if (tx?.is_fraud_flag === 1 && score < 50) score += 35;

  return Math.min(100, Math.max(0, Math.round(score)));
}

function riskTier(score) {
  if (score >= 70) return "CRITICAL";
  if (score >= 40) return "HIGH";
  if (score >= 25) return "WATCH";
  return "NORMAL";
}

function getTriggeredRules(tx) {
  const rules = [];
  const amt = tx?.amount || 0;
  const role = (tx?.emp_class || "").toUpperCase();
  const action = tx?.action_type || "";
  const channel = (tx?.transfer_channel || "").toUpperCase();

  if (role === "CLERK" && amt > 5000000) rules.push(`A5: CLERK txn Rs.${amt.toLocaleString()} exceeds 5M`);
  if (!["IT_ADMIN", "ADMIN"].includes(role) && ["SYSTEM_BULK_EXPORT", "DB_GRANT_ACCESS"].includes(action))
    rules.push(`A5: ${role} attempted restricted '${action}'`);
  if (role === "IT_ADMIN" && amt > 0) rules.push(`A5: IT_ADMIN financial transfer Rs.${amt.toLocaleString()}`);
  if (role === "CLERK" && action === "Approve") rules.push("A5: CLERK performed APPROVE (needs MANAGER)");

  const limits = { UPI: 200000, IMPS: 500000, NEFT: 1000000, RTGS: 100000000 };
  if (limits[channel] && amt > limits[channel])
    rules.push(`A6: ${channel} Rs.${amt.toLocaleString()} exceeds Rs.${limits[channel].toLocaleString()}`);
  if (amt >= 49000 && amt <= 49999) rules.push(`A6: Structuring suspected near 50k`);
  return rules;
}

function extractNlpFlags(tx) {
  const flags = [];
  const text = tx?.raw_complaint_text || "";
  if (text) {
    for (const pat of SENTIMENT_KEYWORDS) {
      const m = text.match(pat);
      if (m) flags.push(`Keyword: '${m[0]}'`);
    }
  }
  return flags;
}

// ─── Generate fallback data (used if API is unreachable) ──────
const HISTORICAL = generateTransactions(40000, new Date("2025-10-01"), new Date("2026-02-28"), 0.021);
const LIVE_STREAM = generateTransactions(8000, new Date("2026-03-01"), new Date("2026-03-30"), 0.02);

// Fallback KPI data derived from generated transactions
function generateFallbackKPIs() {
  const all = [...HISTORICAL, ...LIVE_STREAM];
  const scored = all.map(tx => ({ ...tx, cbsi: scoreTransaction(tx) }));
  return {
    transactions_scanned: scored.length,
    critical_alerts: scored.filter(x => x.cbsi >= 80).length,
    high_risk_flags: scored.filter(x => x.cbsi >= 60 && x.cbsi < 80).length,
    confirmed_fraud: scored.filter(x => x.is_fraud_flag === 1).length,
    avg_cbsi_score: scored.length
      ? Math.round((scored.reduce((s, x) => s + x.cbsi, 0) / scored.length) * 10) / 10
      : 0,
  };
}

// Fallback employee list in the shape the roster table expects
function generateFallbackEmployees() {
  const all = [...HISTORICAL, ...LIVE_STREAM];
  const scored = all.map(tx => ({ ...tx, cbsi: scoreTransaction(tx) }));
  const map = {};
  for (const tx of scored) {
    const eid = tx?.emp_id;
    if (!eid) continue;
    if (!map[eid]) map[eid] = { max: 0, sum: 0, count: 0, role: tx.emp_class, branch: tx.branch_id };
    map[eid].max = Math.max(map[eid].max, tx.cbsi);
    map[eid].sum += tx.cbsi;
    map[eid].count++;
  }
  return Object.entries(map).map(([id, s]) => ({
    id,
    role: s.role || "CLERK",
    branch: s.branch || "BR_01",
    peakCBSI: s.max,
    avgCBSI: s.count ? Math.round((s.sum / s.count) * 10) / 10 : 0,
    transactions: s.count,
    status: riskTier(s.max),
  })).sort((a, b) => b.peakCBSI - a.peakCBSI);
}

// ═══════════════════════════════════════════════════════════════
// ASYNC API FUNCTIONS — Real data from FastAPI backend
// ═══════════════════════════════════════════════════════════════

/**
 * Fetches live employee alert data from the Kafka simulation endpoint.
 * Maps API response to the same shape as generateFallbackEmployees().
 * Falls back to synthetic data silently on any error.
 */
async function fetchEmployees() {
  try {
    const res = await fetch(`${API_BASE}/api/stream/kafka-sim`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return data.map((item) => ({
      id: item.emp_id,
      role: item.type || "CLERK",
      branch: `BR_${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`,
      peakCBSI: item.cbsi,
      avgCBSI: item.cbsi,
      transactions: 1,
      status: riskTier(item.cbsi),
    }));
  } catch (err) {
    console.warn("[VaultMind] fetchEmployees failed, using fallback:", err.message);
    return generateFallbackEmployees();
  }
}

/**
 * Fetches real KPI metrics from the dashboard endpoint.
 * Returns the same shape as generateFallbackKPIs().
 * Falls back to synthetic data silently on any error.
 */
async function fetchKPIs() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/kpis`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return {
      transactions_scanned: data.transactions_scanned,
      critical_alerts: data.critical_alerts,
      high_risk_flags: data.high_risk_flags,
      confirmed_fraud: data.confirmed_fraud,
      avg_cbsi_score: data.avg_cbsi_score,
    };
  } catch (err) {
    console.warn("[VaultMind] fetchKPIs failed, using fallback:", err.message);
    return generateFallbackKPIs();
  }
}

/**
 * Fetches the explainability profile for a specific employee.
 * Maps API response to a profile object shape.
 * Falls back to a default profile silently on any error.
 */
async function fetchEmployeeProfile(empId) {
  try {
    const res = await fetch(`${API_BASE}/api/explain/${empId}`, { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return {
      emp_id: empId,
      risk_score: data.score ?? 0,
      explanation: data.explanation ?? "",
      detection_reasons: data.detection_reasons ?? {},
      agent_scores: data.agent_scores ?? {},
    };
  } catch (err) {
    console.warn(`[VaultMind] fetchEmployeeProfile(${empId}) failed, using fallback:`, err.message);
    // Fallback: derive profile from synthetic data
    const txns = [...HISTORICAL, ...LIVE_STREAM].filter(tx => tx.emp_id === empId);
    const scored = txns.map(tx => ({ ...tx, cbsi: scoreTransaction(tx) }));
    const peak = scored.length ? Math.max(...scored.map(x => x.cbsi)) : 0;
    return {
      emp_id: empId,
      risk_score: peak,
      explanation: peak > 0
        ? `Synthetic analysis: peak CBSI ${peak} across ${scored.length} transactions.`
        : "No alerts found for this employee",
      detection_reasons: {},
      agent_scores: {},
    };
  }
}

/**
 * Top-level initializer — fetches employees and KPIs in parallel.
 * Returns { employees, kpis }. Falls back to synthetic data on failure.
 */
async function initData() {
  try {
    const [employees, kpis] = await Promise.all([
      fetchEmployees(),
      fetchKPIs(),
    ]);
    return { employees, kpis };
  } catch (err) {
    console.warn("[VaultMind] initData failed, using full fallback:", err.message);
    return {
      employees: generateFallbackEmployees(),
      kpis: generateFallbackKPIs(),
    };
  }
}

// ─── Exports ──────────────────────────────────────────────────
// Synchronous exports (unchanged — App.jsx depends on these)
export {
  EMPLOYEES, HISTORICAL, LIVE_STREAM,
  scoreTransaction, riskTier, getTriggeredRules, extractNlpFlags,
  SENTIMENT_KEYWORDS
};

// Async API exports (new — available for future integration)
export {
  fetchEmployees,
  fetchKPIs,
  fetchEmployeeProfile,
  initData,
  generateFallbackKPIs as getDashboardKPIs,
  generateFallbackEmployees as generateEmployees,
};
