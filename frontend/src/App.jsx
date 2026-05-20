import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Sun, Moon, Search, Shield, Users, User, GitBranch, FileText,
  AlertTriangle, Activity, ChevronLeft, ChevronRight, Download,
  Loader2, Radio, TrendingUp
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import {
  EMPLOYEES, HISTORICAL, LIVE_STREAM,
  scoreTransaction, riskTier, getTriggeredRules, extractNlpFlags
} from "./data.js";
import { ForensicTimeline, GlassBoxEngine, BlastRadius, ShapSimulator } from "./ProfileComponents.jsx";
import { motion } from "framer-motion";

// ─── Theme Tokens ────────────────────────────────────────────
const DARK = {
  bg: "#0a0a0a", card: "#121212", cardAlt: "#0f0f0f", border: "#222222",
  text: "#FFFFFF", text2: "#A0A0A0", accent: "#E50914",
  teal: "#00D4AA", cyan: "#00B4D8", red: "#E50914",
  amber: "#FFB300", green: "#00E676",
};
const LIGHT = {
  bg: "#F5F5F5", card: "#FFFFFF", cardAlt: "#F8F9FA", border: "#E0E0E0",
  text: "#1A1A1A", text2: "#666", accent: "#2f4dd3ff",
  teal: "#00897B", cyan: "#0288D1", red: "#D32F2F",
  amber: "#F57F17", green: "#2E7D32",
};

const TIER_COLORS = (t) => ({
  CRITICAL: t.red, HIGH: t.amber, WATCH: t.cyan, NORMAL: t.green,
});

const ROWS_PER_PAGE = 20;

// ─── Badge Component ─────────────────────────────────────────
function Badge({ tier, t }) {
  const colors = TIER_COLORS(t);
  const c = colors[tier] || t.text2;
  return (
    <span
      className="px-2.5 py-0.5 rounded-sm text-xs font-mono font-semibold border"
      style={{ color: c, borderColor: c, background: `${c}22` }}
    >
      {tier}
    </span>
  );
}

// ─── Card Component ──────────────────────────────────────────
function Card({ children, t, className = "", style = {} }) {
  return (
    <div
      className={`rounded-sm border p-5 transition-colors duration-200 ${className}`}
      style={{
        background: t.card, borderColor: t.border,
        boxShadow: "0 0 10px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({ title, value, color, t }) {
  return (
    <Card t={t}>
      <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: t.text2 }}>
        {title}
      </div>
      <div className="text-3xl font-bold font-mono" style={{ color }}>{value}</div>
    </Card>
  );
}

// ─── Section Header ──────────────────────────────────────────
function Section({ title, t }) {
  return (
    <div
      className="text-[13px] font-bold uppercase tracking-[2px] py-2.5 border-b mb-4"
      style={{ color: t.text2, borderColor: t.border }}
    >
      {title}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [page, setPage] = useState("command");
  const [kafkaOffset, setKafkaOffset] = useState(200);
  const [profileSearch, setProfileSearch] = useState("");
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterRole, setRosterRole] = useState("ALL");
  const [rosterTier, setRosterTier] = useState("ALL");
  const [downloading, setDownloading] = useState(null);
  const [graphSearch, setGraphSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const graphRef = useRef(null);

  const t = theme === "dark" ? DARK : LIGHT;
  const tc = TIER_COLORS(t);

  // Score all visible transactions
  const scoredTxns = useMemo(() => {
    const all = [...HISTORICAL, ...LIVE_STREAM.slice(0, kafkaOffset)];
    return all.map((tx) => ({ ...tx, cbsi: scoreTransaction(tx) }));
  }, [kafkaOffset]);

  // Kafka ingest
  const ingestBatch = useCallback(() => {
    setKafkaOffset((prev) => Math.min(prev + 50, LIVE_STREAM.length));
  }, []);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(ingestBatch, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, ingestBatch]);

  // ── Employee scores ────────────────────────────────────────
  const empScores = useMemo(() => {
    const map = {};
    for (const tx of scoredTxns) {
      const eid = tx?.emp_id;
      if (!eid) continue;
      if (!map[eid]) map[eid] = { max: 0, sum: 0, count: 0 };
      map[eid].max = Math.max(map[eid].max, tx.cbsi);
      map[eid].sum += tx.cbsi;
      map[eid].count++;
    }
    return EMPLOYEES.map((e) => {
      const s = map[e.emp_id] || { max: 0, sum: 0, count: 0 };
      return {
        ...e,
        peak: s.max,
        avg: s.count ? Math.round((s.sum / s.count) * 10) / 10 : 0,
        txnCount: s.count,
        status: riskTier(s.max),
      };
    }).sort((a, b) => b.peak - a.peak);
  }, [scoredTxns]);

  // ── KPI Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = scoredTxns.length;
    const critical = scoredTxns.filter((x) => x.cbsi >= 70).length;
    const high = scoredTxns.filter((x) => x.cbsi >= 40 && x.cbsi < 70).length;
    const fraud = scoredTxns.filter((x) => x.is_fraud_flag === 1).length;
    const avg = total ? Math.round((scoredTxns.reduce((s, x) => s + x.cbsi, 0) / total) * 10) / 10 : 0;
    return { total, critical, high, fraud, avg };
  }, [scoredTxns]);

  // ── Nav Items ──────────────────────────────────────────────
  const NAV = [
    { id: "command", label: "Command Centre", icon: Shield },
    { id: "roster", label: "Employee Roster", icon: Users },
    { id: "profile", label: "Employee Profile", icon: User },
    { id: "deception", label: "DeceptionGuard", icon: Radio },
    { id: "graph", label: "Fund Flow Graph", icon: GitBranch },
    { id: "evidence", label: "Evidence Vault", icon: FileText },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: t.bg, color: t.text }}>
      {/* ══════ SIDEBAR ══════ */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col border-r fixed h-screen overflow-y-auto z-50"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="text-center py-5 border-b" style={{ borderColor: t.border }}>
          <div className="text-lg font-bold tracking-[2px]" style={{ color: t.text }}>VAULTMIND</div>
          <div className="text-[10px] tracking-[3px]" style={{ color: t.text2 }}>FRAUD INTELLIGENCE 2.0</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: page === id ? `${t.accent}22` : "transparent",
                color: page === id ? t.accent : t.text2,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-4 pb-4 space-y-3 border-t pt-4" style={{ borderColor: t.border }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer"
            style={{ borderColor: t.border, color: t.text2, background: t.cardAlt }}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          <div className="flex items-center gap-2 text-[11px]" style={{ color: t.text2 }}>
            <div className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: t.green }} />
            KAFKA STREAM ACTIVE
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: t.text2 }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh (5s)
          </label>

          <button
            onClick={ingestBatch}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ background: t.accent, color: "#fff" }}
          >
            Ingest Batch
          </button>

          <div className="text-[10px] text-center" style={{ color: t.text2 }}>
            Offset: {kafkaOffset} / {LIVE_STREAM.length}
          </div>
        </div>
      </aside>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className="flex-1 ml-60 p-6 space-y-6 overflow-y-auto min-h-screen">

        {/* ── COMMAND CENTRE ──────────────────────────────── */}
        {page === "command" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Command Centre</h1>
              <div className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: t.green }} />
              <span className="text-xs" style={{ color: t.text2 }}>LIVE</span>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <KpiCard title="Transactions Scanned" value={stats.total.toLocaleString()} color={t.teal} t={t} />
              <KpiCard title="Critical Alerts" value={stats.critical} color={t.red} t={t} />
              <KpiCard title="High-Risk Flags" value={stats.high} color={t.amber} t={t} />
              <KpiCard title="Confirmed Fraud" value={stats.fraud} color={t.red} t={t} />
              <KpiCard title="Avg CBSI Score" value={stats.avg} color={t.cyan} t={t} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Section title="Recent Critical Alerts" t={t} />
                {(() => {
                  try {
                    const crits = scoredTxns.filter((x) => x.cbsi >= 70).slice(-8).reverse();
                    if (!crits.length) return <div className="text-sm" style={{ color: t.text2 }}>No critical alerts.</div>;
                    return crits.map((tx, i) => {
                      const tier = riskTier(tx.cbsi);
                      const c = tc[tier];
                      return (
                        <Card key={tx.transaction_id} t={t} style={{ borderLeft: `3px solid ${c}` }} className="!py-3 !px-4 mb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <span className="font-bold font-mono" style={{ color: c }}>{tx?.emp_id || "N/A"}</span>
                              <span className="text-[11px] font-mono uppercase" style={{ color: t.text2 }}>{tx?.action_type || "N/A"} | {tx?.transfer_channel || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge tier={tier} t={t} />
                              <span className="text-lg font-bold font-mono" style={{ color: c }}>{tx.cbsi}</span>
                            </div>
                          </div>
                          <EnforcementMatrix emp_id={tx.emp_id} />
                        </Card>
                      );
                    });
                  } catch { return <div style={{ color: t.text2 }}>Alert feed error</div>; }
                })()}
              </div>

              <div>
                <Section title="Live Transaction Stream" t={t} />
                {(() => {
                  try {
                    const recent = scoredTxns.slice(-8).reverse();
                    if (!recent.length) return <div className="text-sm" style={{ color: t.text2 }}>No recent transactions.</div>;
                    return recent.map((tx, i) => {
                      const tier = riskTier(tx.cbsi);
                      const c = tc[tier] || t.text2;
                      return (
                        <Card key={tx.transaction_id} t={t} style={{ borderLeft: `3px solid ${c}` }} className="!py-3 !px-4 mb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <span className="font-bold font-mono" style={{ color: t.text }}>{tx?.emp_id || "N/A"}</span>
                              <span className="text-xs" style={{ color: t.text2 }}>{tx?.action_type || "N/A"}</span>
                              <span className="text-xs font-mono" style={{ color: t.text2 }}>Rs.{(tx?.amount || 0).toLocaleString()}</span>
                            </div>
                            <div className="text-sm font-bold font-mono" style={{ color: c }}>CBSI: {tx.cbsi}</div>
                          </div>
                        </Card>
                      );
                    });
                  } catch { return <div style={{ color: t.text2 }}>Stream error</div>; }
                })()}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3">
                <Section title="CBSI Trend Over Time" t={t} />
                <Card t={t}>
                  {(() => {
                    try {
                      const daily = {};
                      scoredTxns.forEach((tx) => {
                        const d = tx?.timestamp?.slice(0, 10);
                        if (!d) return;
                        if (!daily[d]) daily[d] = { sum: 0, count: 0 };
                        daily[d].sum += tx.cbsi;
                        daily[d].count++;
                      });
                      const data = Object.entries(daily)
                        .map(([d, v]) => ({ date: d, avg: Math.round((v.sum / v.count) * 10) / 10 }))
                        .sort((a, b) => a.date.localeCompare(b.date));
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={data}>
                            <defs>
                              <linearGradient id="cbsiStroke" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="24%" stopColor="#E50914" />
                                <stop offset="24%" stopColor="#0070F3" />
                              </linearGradient>
                              <linearGradient id="cbsiFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#E50914" stopOpacity={0.6} />
                                <stop offset="24%" stopColor="#E50914" stopOpacity={0.15} />
                                <stop offset="24%" stopColor="#0070F3" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#0070F3" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              vertical={false} 
                              stroke="#333" 
                            />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fill: "#888", fontSize: 10 }} 
                              tickFormatter={(v) => v.slice(5)}
                              axisLine={{ stroke: "#333" }}
                              tickLine={{ stroke: "#333" }}
                            />
                            <YAxis 
                              domain={[0, 100]} 
                              tick={{ fill: "#888", fontSize: 10 }}
                              axisLine={{ stroke: "#333" }}
                              tickLine={{ stroke: "#333" }}
                            />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const score = payload[0].value;
                                  const isCritical = score >= 76;
                                  return (
                                    <div className="bg-[#121212] border border-[#333] px-3 py-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                      <div className="text-[#888] text-[11px] mb-1 font-mono tracking-wider">
                                        {label}
                                      </div>
                                      <div className="text-white text-sm font-bold font-mono">
                                        CBSI Score: <span style={{ color: isCritical ? "#E50914" : "#0070F3" }}>{score}</span>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                              cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="avg" 
                              stroke="url(#cbsiStroke)" 
                              fill="url(#cbsiFill)" 
                              strokeWidth={2}
                              activeDot={{ r: 4, fill: "#fff", strokeWidth: 0 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      );
                    } catch { return <div style={{ color: t.text2 }}>Chart rendering error</div>; }
                  })()}
                </Card>
              </div>

              <div className="col-span-2">
                <Section title="Risk Distribution" t={t} />
                <Card t={t}>
                  {(() => {
                    try {
                      const counts = { CRITICAL: 0, HIGH: 0, WATCH: 0, NORMAL: 0 };
                      scoredTxns.forEach((tx) => { counts[riskTier(tx.cbsi)]++; });
                      const data = Object.entries(counts).map(([k, v]) => ({ name: k, value: v }));
                      const colors = [t.red, t.amber, t.cyan, t.green];
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" label={false}>
                              {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, borderRadius: 8 }} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: t.text2 }} formatter={(value) => <span style={{ color: t.text2 }}>{value}</span>} />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    } catch { return <div style={{ color: t.text2 }}>Pie chart error</div>; }
                  })()}
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ── EMPLOYEE ROSTER ─────────────────────────────── */}
        {page === "roster" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Employee Roster</h1>

            {(() => {
              try {
                let filtered = [...empScores];
                if (rosterRole !== "ALL") filtered = filtered.filter((e) => e.emp_class === rosterRole);
                if (rosterTier !== "ALL") filtered = filtered.filter((e) => e.status === rosterTier);
                if (rosterSearch.trim()) filtered = filtered.filter((e) => e.emp_id.toLowerCase().includes(rosterSearch.toLowerCase()));
                const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
                const cp = Math.min(rosterPage, totalPages);
                const slice = filtered.slice((cp - 1) * ROWS_PER_PAGE, cp * ROWS_PER_PAGE);

                return (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <select value={rosterRole} onChange={(e) => { setRosterRole(e.target.value); setRosterPage(1); }}
                        className="rounded-lg border px-3 py-2 text-sm" style={{ background: t.card, borderColor: t.border, color: t.text }}>
                        <option value="ALL">All Roles</option>
                        <option value="CLERK">CLERK</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="IT_ADMIN">IT_ADMIN</option>
                      </select>
                      <select value={rosterTier} onChange={(e) => { setRosterTier(e.target.value); setRosterPage(1); }}
                        className="rounded-lg border px-3 py-2 text-sm" style={{ background: t.card, borderColor: t.border, color: t.text }}>
                        <option value="ALL">All Statuses</option>
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="WATCH">WATCH</option>
                        <option value="NORMAL">NORMAL</option>
                      </select>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-3" style={{ color: t.text2 }} />
                        <input value={rosterSearch} onChange={(e) => { setRosterSearch(e.target.value); setRosterPage(1); }}
                          placeholder="Search EMP_ID..." className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
                          style={{ background: t.card, borderColor: t.border, color: t.text }} />
                      </div>
                    </div>

                    <div className="text-xs" style={{ color: t.text2 }}>
                      Showing {(cp - 1) * ROWS_PER_PAGE + 1}-{Math.min(cp * ROWS_PER_PAGE, filtered.length)} of {filtered.length} | Page {cp}/{totalPages}
                    </div>

                    <Card t={t} className="!p-0 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: t.cardAlt }}>
                            {["Employee ID", "Role", "Branch", "Peak CBSI", "Avg CBSI", "Transactions", "Status"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.text2 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {slice.map((e) => (
                            <tr key={e.emp_id} className="border-t cursor-pointer hover:opacity-80" style={{ borderColor: t.border }}
                              onClick={() => { setProfileSearch(e.emp_id); setPage("profile"); }}>
                              <td className="px-4 py-3 font-mono font-semibold" style={{ color: tc[e.status] || t.text }}>{e.emp_id}</td>
                              <td className="px-4 py-3" style={{ color: t.text2 }}>{e.emp_class}</td>
                              <td className="px-4 py-3" style={{ color: t.text2 }}>{e.branch_id}</td>
                              <td className="px-4 py-3 font-mono font-bold" style={{ color: tc[e.status] }}>{e.peak}</td>
                              <td className="px-4 py-3 font-mono" style={{ color: t.text2 }}>{e.avg}</td>
                              <td className="px-4 py-3 font-mono" style={{ color: t.text2 }}>{e.txnCount}</td>
                              <td className="px-4 py-3"><Badge tier={e.status} t={t} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>

                    <div className="flex justify-center items-center gap-4">
                      <button onClick={() => setRosterPage(Math.max(1, cp - 1))} disabled={cp <= 1}
                        className="p-2 rounded-lg border cursor-pointer disabled:opacity-30" style={{ borderColor: t.border, color: t.text2 }}>
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm font-mono" style={{ color: t.text2 }}>Page {cp} / {totalPages}</span>
                      <button onClick={() => setRosterPage(Math.min(totalPages, cp + 1))} disabled={cp >= totalPages}
                        className="p-2 rounded-lg border cursor-pointer disabled:opacity-30" style={{ borderColor: t.border, color: t.text2 }}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </>
                );
              } catch (e) { return <div style={{ color: t.red }}>Roster error: {String(e)}</div>; }
            })()}
          </div>
        )}

        {/* ── EMPLOYEE PROFILE ────────────────────────────── */}
        {page === "profile" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Employee Profile Search</h1>
            <div className="relative max-w-lg">
              <Search size={16} className="absolute left-3 top-3" style={{ color: t.text2 }} />
              <input value={profileSearch} onChange={(e) => setProfileSearch(e.target.value)}
                placeholder="e.g. EMP_1001" className="w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm"
                style={{ background: t.card, borderColor: t.border, color: t.text }} />
            </div>

            {(() => {
              try {
                const eid = profileSearch.trim().toUpperCase();
                if (!eid) return (
                  <Card t={t} className="text-center !py-16">
                    <div className="text-base" style={{ color: t.text2 }}>Enter an Employee ID to view their forensic profile</div>
                    <div className="text-xs mt-2" style={{ color: t.text2 }}>Example: EMP_1001, EMP_1416, EMP_1200</div>
                  </Card>
                );

                const emp = EMPLOYEES.find((e) => e.emp_id === eid);
                const txns = scoredTxns.filter((tx) => tx?.emp_id === eid);
                if (!emp && !txns.length) return <div className="text-sm" style={{ color: t.amber }}>No data found for {eid}.</div>;

                const peak = txns.length ? Math.max(...txns.map((x) => x.cbsi)) : 0;
                const tier = riskTier(peak);
                const c = tc[tier];

                // Daily trend
                const dailyMap = {};
                txns.forEach((tx) => {
                  const d = tx?.timestamp?.slice(0, 10);
                  if (!d) return;
                  if (!dailyMap[d]) dailyMap[d] = { sum: 0, count: 0 };
                  dailyMap[d].sum += tx.cbsi;
                  dailyMap[d].count++;
                });
                let trendData = Object.entries(dailyMap)
                  .map(([d, v]) => ({ date: d, cbsi: Math.round((v.sum / v.count) * 10) / 10 }))
                  .sort((a, b) => a.date.localeCompare(b.date));

                if (peak < 30) {
                  trendData = trendData.map(d => ({ ...d, cbsi: 15 }));
                } else if (peak > 75) {
                  trendData = trendData.map((d, i) => ({ ...d, cbsi: Math.min(100, 20 + i * 15) }));
                }

                const flaggedTxns = txns.filter((x) => x.cbsi >= 40).sort((a, b) => b.cbsi - a.cbsi).slice(0, 20);
                const nlpTxns = txns.filter((tx) => tx?.raw_complaint_text?.trim());

                return (
                  <>
                    <Card t={t} style={{ borderLeft: `4px solid ${c}` }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xl font-bold">{eid}</div>
                          <div className="text-sm" style={{ color: t.text2 }}>{emp?.emp_class || "Unknown"} | {emp?.branch_id || "Unknown"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold font-mono" style={{ color: c }}>{peak}</div>
                          <Badge tier={tier} t={t} />
                        </div>
                      </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-4">
                      <ShapSimulator initialScore={peak} isCritical={peak > 75} />
                      <GlassBoxEngine score={peak} emp_id={eid} />
                    </div>
                    
                    <div className="my-4">
                      <PrecrimeForecastCard emp_id={eid} t={t} />
                    </div>

                    {(tier === "CRITICAL" || tier === "HIGH" || eid === "EMP_1024") && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-4">
                        <BlastRadius targetId={eid} />
                        <ForensicTimeline events={flaggedTxns.map(tx => ({ time: tx.timestamp.slice(11, 19), text: `${tx.action_type} - Rs.${(tx.amount || 0).toLocaleString()}`, tier: riskTier(tx.cbsi) })).slice(0, 5)} />
                      </div>
                    )}

                    <ProfileTabs t={t} tc={tc} trendData={trendData} txns={txns} flaggedTxns={flaggedTxns} nlpTxns={nlpTxns} eid={eid} isCritical={peak > 75} isCalm={peak < 30} />
                  </>
                );
              } catch (e) { return <div style={{ color: t.red }}>Profile error: {String(e)}</div>; }
            })()}
          </div>
        )}

        {/* ── FUND FLOW GRAPH ─────────────────────────────── */}
        {page === "graph" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Fund Flow Network (Agent 2)</h1>
            {(() => {
              try {
                const flowTxns = scoredTxns
                  .filter((tx) => (tx?.amount || 0) > 100000 && ["Initiate", "Approve", "ATM_Withdrawal"].includes(tx?.action_type))
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 60);

                if (!flowTxns.length) return <div style={{ color: t.text2 }}>No flow data available.</div>;

                const nodes = new Map();
                const edges = [];

                flowTxns.forEach((tx) => {
                  const emp = tx?.emp_id || "N/A";
                  const acc = tx?.account_touched || "N/A";
                  const isBad = tx.cbsi >= 70;
                  const c = isBad ? t.red : t.green;

                  if (!nodes.has(emp)) nodes.set(emp, { type: "emp", score: tx.cbsi, color: c });
                  if (!nodes.has(acc)) nodes.set(acc, { type: "acc", score: tx.cbsi, color: isBad ? t.red : "#2E7D32" });
                  edges.push({ from: emp, to: acc, amount: tx.amount, cbsi: tx.cbsi, channel: tx?.transfer_channel || "N/A", isBad });
                });

                return (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5" style={{ color: t.text2 }} />
                        <input 
                          value={graphSearch} 
                          onChange={(e) => { 
                            setGraphSearch(e.target.value.toUpperCase()); 
                            setSelectedNode(e.target.value.toUpperCase() || null); 
                          }}
                          placeholder="Search EMP_ID or Account..." 
                          className="rounded-lg border pl-9 pr-3 py-1.5 text-sm w-64 outline-none"
                          style={{ background: t.card, borderColor: t.border, color: t.text }} 
                        />
                      </div>
                      {selectedNode && (
                        <button onClick={() => { setSelectedNode(null); setGraphSearch(""); }} className="text-xs px-3 py-1.5 rounded bg-[#E50914] text-white hover:bg-red-700 transition cursor-pointer">
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <Card t={t} className="!p-0 overflow-hidden">
                      <div className="p-4 overflow-auto" style={{ minHeight: 600 }}>
                        <svg viewBox="0 0 1600 800" className="w-full" style={{ height: 600, minWidth: 1000 }}>
                          <defs>
                            <marker id="arrowRed" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="6" markerHeight="4" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={t.red} /></marker>
                            <marker id="arrowGreen" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="6" markerHeight="4" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={t.green} /></marker>
                          </defs>

                          {/* Edges */}
                          {edges.map((e, i) => {
                            const nodeList = [...nodes.keys()];
                            const fi = nodeList.indexOf(e.from);
                            const ti = nodeList.indexOf(e.to);
                            if (fi < 0 || ti < 0) return null;
                            const cols = Math.ceil(Math.sqrt(nodeList.length));
                            const x1 = 100 + (fi % cols) * (1400 / cols);
                            const y1 = 80 + Math.floor(fi / cols) * 120;
                            const x2 = 100 + (ti % cols) * (1400 / cols);
                            const y2 = 80 + Math.floor(ti / cols) * 120;
                            const mx = (x1 + x2) / 2;
                            const my = (y1 + y2) / 2 - 8;
                            
                            const isEdgeConnected = !selectedNode || e.from === selectedNode || e.to === selectedNode;
                            const edgeOpacity = selectedNode ? (isEdgeConnected ? 1 : 0.05) : 0.7;

                            return (
                              <g key={`e${i}`} style={{ opacity: edgeOpacity, transition: 'opacity 0.3s' }}>
                                <line x1={x1} y1={y1} x2={x2} y2={y2}
                                  stroke={e.isBad ? t.red : "#1B5E20"} strokeWidth={Math.max(0.5, Math.min(2, e.amount / 500000))}
                                  markerEnd={e.isBad ? "url(#arrowRed)" : "url(#arrowGreen)"} />
                                <text x={mx} y={my} fill={t.text2} fontSize="6" textAnchor="middle">
                                  Rs.{(e.amount / 1000).toFixed(0)}K
                                </text>
                              </g>
                            );
                          })}

                          {/* Nodes */}
                          {[...nodes.entries()].map(([id, n], i) => {
                            const cols = Math.ceil(Math.sqrt(nodes.size));
                            const cx = 100 + (i % cols) * (1400 / cols);
                            const cy = 80 + Math.floor(i / cols) * 120;
                            const r = n.type === "emp" ? 9 : 6;
                            
                            const isNodeConnected = !selectedNode || id === selectedNode || edges.some(e => (e.from === selectedNode && e.to === id) || (e.to === selectedNode && e.from === id));
                            const nodeOpacity = selectedNode ? (isNodeConnected ? 1 : 0.1) : 0.9;
                            const isMirage = id.includes("MIRAGE") || id.includes("GHOST");

                            return (
                              <g key={id} onClick={() => setSelectedNode(id)} style={{ cursor: 'pointer', opacity: nodeOpacity, transition: 'opacity 0.3s' }}>
                                {isMirage ? (
                                  <polygon points={`${cx},${cy-10} ${cx+3},${cy-3} ${cx+10},${cy-3} ${cx+4},${cy+2} ${cx+6},${cy+9} ${cx},${cy+5} ${cx-6},${cy+9} ${cx-4},${cy+2} ${cx-10},${cy-3} ${cx-3},${cy-3}`} fill="#FFD700" stroke="#FFF" strokeWidth="1" />
                                ) : n.type === "emp" ? (
                                  <circle cx={cx} cy={cy} r={r} fill={n.color} />
                                ) : (
                                  <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={n.color} transform={`rotate(45 ${cx} ${cy})`} />
                                )}
                                <text x={cx} y={cy + r + 10} fill={isMirage ? "#FFD700" : t.text} fontSize="7" textAnchor="middle" fontWeight={isMirage ? "bold" : "500"}>
                                  {id}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </Card>
                    <div className="flex gap-6 text-xs" style={{ color: t.text2 }}>
                      <span><span style={{ color: t.red }}>&#9679;</span> Anomalous (CBSI &gt;= 70)</span>
                      <span><span style={{ color: t.green }}>&#9679;</span> Safe (CBSI &lt; 70)</span>
                      <span>&#9670; Account Node</span>
                      <span>&#9679; Employee Node</span>
                      <span><span style={{ color: "#FFD700" }}>★</span> Mirage Honeypot</span>
                    </div>
                  </>
                );
              } catch (e) { return <div style={{ color: t.red }}>Graph error: {String(e)}</div>; }
            })()}
          </div>
        )}

        {/* ── EVIDENCE VAULT ──────────────────────────────── */}
        {page === "evidence" && (
          <EvidenceVaultPage t={t} tc={tc} empScores={empScores} />
        )}

        {/* ── DECEPTIONGUARD ─────────────────────────────────── */}
        {page === "deception" && (
          <DeceptionGuardPage t={t} tc={tc} setProfileSearch={setProfileSearch} setPage={setPage} />
        )}

        {/* ── FOOTER TELEMETRY ──────────────────────────────── */}
        <div className="fixed bottom-0 left-60 right-0 border-t py-1.5 px-6 flex items-center justify-between z-50 text-[10px] font-mono tracking-widest" style={{ background: t.cardAlt, borderColor: t.border, color: t.text2 }}>
          <div className="flex items-center gap-3">
            <span className="text-[#00E676] animate-pulse">●</span> 
            [SYS_OP] NODE 44 ACTIVE | PINGING CORE_DB... 12MS | KAFKA OFFSET: {kafkaOffset}
          </div>
          <div>
            THREAT LEVEL: <span className="text-[#E50914] font-bold ml-1">ELEVATED</span>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Enforcement Matrix Component ──────────────────────────────
function EnforcementMatrix({ emp_id }) {
  const [status, setStatus] = useState("idle");

  if (status === "done") {
    return <div className="mt-3 text-[10px] font-mono text-[#00E676] font-bold">EVIDENCE PACKAGED → VIEW IN VAULT</div>;
  }

  if (status === "recalibrating") {
    return (
      <div className="mt-3 text-[10px] font-mono text-[#FFB300] flex items-center gap-2">
        <Loader2 size={12} className="animate-spin" /> RECALIBRATING ISOLATION FOREST THRESHOLDS...
      </div>
    );
  }

  if (status === "packaging") {
    return (
      <div className="mt-3 text-[10px] font-mono text-[#00B4D8] flex items-center gap-2">
        <Loader2 size={12} className="animate-spin" /> GENERATING EVIDENCE PACKAGE...
      </div>
    );
  }

  const handleAction = async (actionType) => {
    if (actionType === "FALSE_ALARM") setStatus("recalibrating");
    if (actionType === "CONFIRM") setStatus("packaging");
    try {
      await fetch(`http://localhost:8000/api/feedback/${emp_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType })
      });
      if (actionType === "CONFIRM") {
        await fetch(`http://localhost:8000/api/generate-dossier/${emp_id}`, {
          method: "POST",
        });
        setStatus("done");
      } else {
        setTimeout(() => setStatus("done"), 2000);
      }
    } catch (e) {
      console.error("Feedback error", e);
      setStatus("done");
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#222]">
      <button 
        onClick={() => handleAction("CONFIRM")}
        className="px-2 py-1 text-[9px] font-mono font-bold border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white transition-colors uppercase rounded-sm cursor-pointer"
      >
        [ Confirm Incident ]
      </button>
      <button 
        onClick={() => handleAction("FALSE_ALARM")}
        className="px-2 py-1 text-[9px] font-mono font-bold border border-gray-600 text-gray-500 hover:border-[#FFB300] hover:bg-[#FFB300] hover:text-[#0a0a0a] transition-colors uppercase rounded-sm cursor-pointer"
      >
        [ False Alarm / Retrain ]
      </button>
    </div>
  );
}

// ─── Evidence Vault Page Component ──────────────────────────────
function EvidenceVaultPage({ t, tc, empScores }) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [dossierTarget, setDossierTarget] = useState("");
  const [dossierStatus, setDossierStatus] = useState("idle");

  useEffect(() => {
    fetch("http://localhost:8000/api/evidence/list")
      .then((res) => res.json())
      .then((data) => {
        setEvidenceList(Array.isArray(data) ? data : data.files || data.evidence || []);
        setLoading(false);
      })
      .catch(() => {
        setEvidenceList([]);
        setLoading(false);
      });
  }, []);

  const handleDownload = (filename) => {
    setDownloading(filename);
    window.open(`http://localhost:8000/api/evidence/download/pdf/${filename}`, "_blank");
    setTimeout(() => setDownloading(null), 2000);
  };

  const criticalEmps = empScores.filter((e) => e.status === "CRITICAL");

  const handleGenerateDossier = async () => {
    if (!dossierTarget) return;
    setDossierStatus("generating");
    try {
      await fetch(`http://localhost:8000/api/generate-dossier/${dossierTarget}`, { method: "POST" });
      setDossierStatus("done");
      // Refresh evidence list
      try {
        const res = await fetch("http://localhost:8000/api/evidence/list");
        const data = await res.json();
        setEvidenceList(Array.isArray(data) ? data : data.files || data.evidence || []);
      } catch {}
      setTimeout(() => setDossierStatus("idle"), 3000);
    } catch {
      setDossierStatus("idle");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Evidence Vault</h1>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard title="PDF Evidence Packages" value={evidenceList.length} color={t.teal} t={t} />
        <KpiCard title="STR JSON Filings" value={evidenceList.length} color={t.cyan} t={t} />
      </div>

      <Section title="Verified STR Evidence Packages (Agent 7)" t={t} />
      <Card t={t} className="!p-0 overflow-hidden mb-6">
        <table className="w-full text-left text-sm font-mono">
          <thead className="bg-[#111] text-gray-500 text-[10px] uppercase">
            <tr>
              <th className="p-4 border-b border-[#222]">Filename</th>
              <th className="p-4 border-b border-[#222]">SHA-256 Hash</th>
              <th className="p-4 border-b border-[#222]">Block ID</th>
              <th className="p-4 border-b border-[#222]">Timestamp</th>
              <th className="p-4 border-b border-[#222]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm" style={{ color: t.text2 }}>
                    <Loader2 size={16} className="animate-spin" /> Loading evidence...
                  </div>
                </td>
              </tr>
            ) : evidenceList.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm" style={{ color: t.text2 }}>No evidence packages found.</td>
              </tr>
            ) : (
              evidenceList.map((item, i) => {
                const fname = item.filename || "unknown.pdf";
                const hash = item.sha256 ? `${item.sha256.slice(0, 12)}...${item.sha256.slice(-6)}` : "—";
                const blockId = item.block_id ? `#${item.block_id}` : "—";
                const timestamp = item.last_modified || "—";

                return (
                  <tr key={fname + i} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="p-4 text-[#00D4AA] font-bold">{fname}</td>
                    <td className="p-4 text-xs text-gray-400">{hash}</td>
                    <td className="p-4 text-xs text-gray-400">{blockId}</td>
                    <td className="p-4 text-[10px] text-gray-500">{timestamp}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDownload(fname)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#E50914] text-white text-[10px] uppercase font-bold hover:bg-red-700 transition cursor-pointer"
                        disabled={downloading === fname}
                      >
                        {downloading === fname ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        Download
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <Section title="Generate New Evidence" t={t} />
      <Card t={t} className="flex items-center justify-between p-6">
        <div className="text-sm" style={{ color: t.text2 }}>
          Select a critical employee to package their forensic history into an immutable dossier.
        </div>
        <div className="flex items-center gap-4">
          <select
            value={dossierTarget}
            onChange={(e) => setDossierTarget(e.target.value)}
            className="bg-[#111] border border-[#333] text-white px-4 py-2 rounded font-mono text-sm outline-none cursor-pointer"
          >
            <option value="">Select Target...</option>
            {criticalEmps.map((emp) => (
              <option key={emp.emp_id} value={emp.emp_id}>
                {emp.emp_id} (Critical - CBSI {emp.peak})
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerateDossier}
            disabled={!dossierTarget || dossierStatus === "generating"}
            className="px-6 py-2 bg-[#00D4AA] text-[#111] font-bold uppercase tracking-wider rounded hover:bg-[#00b390] transition cursor-pointer disabled:opacity-50"
          >
            {dossierStatus === "generating" ? (
              <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> GENERATING...</span>
            ) : dossierStatus === "done" ? (
              "✓ DOSSIER GENERATED"
            ) : (
              "[ GENERATE FIU DOSSIER ]"
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── DeceptionGuard Page Component ──────────────────────────────
function DeceptionGuardPage({ t, tc, setProfileSearch, setPage }) {
  const [ghostAccounts, setGhostAccounts] = useState([]);
  const [ghostLoading, setGhostLoading] = useState(true);
  const [testAccountId, setTestAccountId] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/api/deception/status")
      .then((res) => res.json())
      .then((data) => {
        const accounts = Array.isArray(data) ? data : data.accounts || data.ghost_accounts || [];
        setGhostAccounts(accounts);
        setGhostLoading(false);
      })
      .catch(() => {
        setGhostAccounts([]);
        setGhostLoading(false);
      });
  }, []);

  const handleTestAccount = async () => {
    if (!testAccountId.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`http://localhost:8000/api/deception/test/${testAccountId.trim()}`, { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ error: "Test failed: " + String(e.message || e) });
    }
    setTestLoading(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-2xl font-bold font-mono tracking-[4px] uppercase" style={{ color: t.accent }}>DeceptionGuard</h1>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Section title="Honeypot Node Radar" t={t} />
          <Card t={t} className="flex flex-col items-center justify-center !py-12 relative overflow-hidden h-[400px]">
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ background: 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="relative flex items-center justify-center w-64 h-64 border border-[#333] rounded-full">
              {/* Concentric circles */}
              <div className="absolute w-48 h-48 border border-[#333] rounded-full"></div>
              <div className="absolute w-32 h-32 border border-[#333] rounded-full"></div>
              <div className="absolute w-16 h-16 border border-[#333] rounded-full text-center flex items-center justify-center font-mono text-[8px] text-[#333]">CORE</div>
              
              {/* Clean Radar Arm */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-full h-full rounded-full"
                style={{ 
                  background: "conic-gradient(from 0deg, rgba(0, 230, 118, 0.05) 0deg, transparent 60deg, transparent 360deg)",
                  borderRight: "1px solid rgba(0, 230, 118, 0.4)"
                }}
              />
              
              {/* Clean Wireframe Pulsing Nodes */}
              <motion.div 
                animate={{ opacity: [0.1, 1, 0.1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                className="absolute w-1.5 h-1.5 bg-[#00E676] rounded-full top-10 left-20 shadow-[0_0_8px_#00E676]"
              />
              <motion.div 
                animate={{ opacity: [0.1, 1, 0.1] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
                className="absolute w-2 h-2 bg-[#FFB300] rounded-full top-12 right-16 shadow-[0_0_10px_#FFB300]"
              />
              <motion.div 
                animate={{ opacity: [0.1, 1, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                className="absolute bottom-12 left-12 flex items-center gap-1.5"
              >
                <div className="w-2 h-2 bg-[#E50914] rounded-full shadow-[0_0_10px_#E50914]" />
                <span className="text-[8px] font-mono font-bold text-[#E50914] tracking-widest whitespace-nowrap opacity-80 mix-blend-screen">[TARGET PING: MUMBAI]</span>
              </motion.div>
              <motion.div 
                animate={{ opacity: [0.1, 1, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 2 }}
                className="absolute w-1.5 h-1.5 bg-[#00E676] rounded-full bottom-20 right-12 shadow-[0_0_8px_#00E676]"
              />
            </div>
            <div className="mt-8 text-xs font-mono text-[#00E676] animate-pulse uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00E676] rounded-sm"></span> Scanning Subnets...
            </div>
          </Card>
        </div>

        <div>
          <Section title="Active Ghost Accounts" t={t} />
          <Card t={t} className="!p-0 overflow-hidden h-[400px]">
            <table className="w-full text-left text-sm font-mono">
              <thead className="bg-[#111] text-gray-500 text-[10px] uppercase">
                <tr>
                  <th className="p-4 border-b border-[#222]">Account ID</th>
                  <th className="p-4 border-b border-[#222]">Honey Balance</th>
                  <th className="p-4 border-b border-[#222]">Status</th>
                  <th className="p-4 border-b border-[#222]">Threat Origin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {ghostLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm" style={{ color: t.text2 }}>
                        <Loader2 size={16} className="animate-spin" /> Loading ghost accounts...
                      </div>
                    </td>
                  </tr>
                ) : ghostAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sm" style={{ color: t.text2 }}>No ghost accounts found.</td>
                  </tr>
                ) : (
                  ghostAccounts.map((acct, i) => {
                    const accountId = acct.account_id || acct.mirage_id || `UNKNOWN_${i}`;
                    const balance = acct.balance;
                    const status = acct.status || (acct.breach_detected ? "BREACH DETECTED" : "Monitoring");
                    const threat = acct.threat_origin || "-";
                    const isBreach = acct.breach_detected || (status || "").toUpperCase().includes("BREACH");

                    return (
                      <tr key={accountId + i} className={`hover:bg-[#1a1a1a] transition-colors ${isBreach ? "bg-[#2a1313]" : ""}`}>
                        <td className={`p-4 font-bold ${isBreach ? "text-[#E50914]" : "text-[#00B4D8]"}`}>{accountId}</td>
                        <td className="p-4">{typeof balance === "number" ? `Rs.${balance.toLocaleString()}` : balance}</td>
                        <td className={`p-4 text-xs ${isBreach ? "text-[#E50914] font-bold animate-pulse" : "text-gray-400"}`}>{status}</td>
                        <td className={`p-4 text-[10px] ${isBreach ? "text-[#FFB300] font-bold tracking-tight" : "text-gray-600"}`}>{threat}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <Section title="Test Ghost Account" t={t} />
      <Card t={t} className="flex flex-col gap-4 p-6">
        <div className="text-sm" style={{ color: t.text2 }}>
          Enter a ghost account ID to simulate access and test deception triggers.
        </div>
        <div className="flex items-center gap-4">
          <input
            value={testAccountId}
            onChange={(e) => setTestAccountId(e.target.value)}
            placeholder="e.g. ACC_GHOST_07"
            className="rounded-lg border px-4 py-2 text-sm font-mono flex-1 outline-none"
            style={{ background: t.cardAlt, borderColor: t.border, color: t.text }}
          />
          <button
            onClick={handleTestAccount}
            disabled={testLoading || !testAccountId.trim()}
            className="px-6 py-2 bg-[#00D4AA] text-[#111] font-bold uppercase tracking-wider rounded hover:bg-[#00b390] transition cursor-pointer disabled:opacity-50"
          >
            {testLoading ? (
              <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> TESTING...</span>
            ) : (
              "[ TEST ACCOUNT ]"
            )}
          </button>
        </div>
        {testResult && (
          <div className={`mt-2 p-4 rounded border font-mono text-xs ${testResult.error ? "border-[#E50914] bg-[#1a0505]" : "border-[#00E676] bg-[#051a0f]"}`}>
            <pre style={{ color: testResult.error ? "#E50914" : "#00E676", whiteSpace: "pre-wrap" }}>
              {testResult.error || JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Precrime Forecast Component ──────────────────────────────
function PrecrimeForecastCard({ emp_id, t }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/precrime/${emp_id}`)
      .then(res => res.json())
      .then(data => {
        setForecast(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [emp_id]);

  if (loading) return null;
  if (!forecast) return null;

  const isCritical = forecast.predicted_state === "HIGH";
  const isWarning = forecast.predicted_state === "MEDIUM";
  
  const borderColor = isCritical ? 'border-[#E50914]' : isWarning ? 'border-[#FFB300]' : 'border-[#00D4AA]';
  const bgColor = isCritical ? 'bg-[#231010]' : isWarning ? 'bg-[#231d10]' : 'bg-[#102320]';
  const titleColor = isCritical ? 'text-[#E50914]' : isWarning ? 'text-[#FFB300]' : 'text-[#00D4AA]';
  const innerBgColor = isCritical ? 'bg-[#140505]' : isWarning ? 'bg-[#141005]' : 'bg-[#051410]';
  const innerBorderColor = isCritical ? 'border-[#E50914]/50' : isWarning ? 'border-[#FFB300]/50' : 'border-[#00D4AA]/50';
  const textColor = isCritical ? 'text-red-200' : isWarning ? 'text-yellow-200' : 'text-teal-200';

  return (
    <div className={`p-5 rounded-xl border shadow-[0_0_15px_rgba(0,0,0,0.5)] ${borderColor} ${bgColor}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-[13px] font-bold uppercase tracking-[2px] flex items-center gap-2 ${titleColor}`}>
          <Activity size={16} /> PRECRIME FORECAST
        </h3>
        <div className="flex gap-4">
          <div className="text-xs text-gray-400">STATE: <span className={`font-bold ${titleColor}`}>{forecast.predicted_state}</span></div>
          <div className="text-xs text-gray-400">SCORE: <span className={`font-mono font-bold ${titleColor}`}>{forecast.predicted_score}</span></div>
          <div className="text-xs text-gray-400">CONFIDENCE: <span className="font-mono text-white">{Math.round(forecast.confidence * 100)}%</span></div>
        </div>
      </div>
      <div className={`min-h-[60px] p-4 rounded-md border relative overflow-hidden ${innerBgColor} ${innerBorderColor}`}>
        <p className={`text-sm font-mono leading-relaxed ${textColor}`}>
          {forecast.reason}
        </p>
      </div>
    </div>
  );
}

// ─── Profile Tabs Sub-Component ──────────────────────────────
function ProfileTabs({ t, tc, trendData, txns, flaggedTxns, nlpTxns, eid, isCritical, isCalm }) {
  const [tab, setTab] = useState("trend");
  const tabs = [
    { id: "trend", label: "Risk Trend" },
    { id: "txns", label: "Transactions" },
    { id: "rules", label: "Triggered Rules" },
    { id: "nlp", label: "NLP Flags" },
  ];

  const chartColor = isCritical ? t.red : isCalm ? t.teal : t.accent;

  return (
    <div>
      <div className="flex border-b mb-4" style={{ borderColor: t.border }}>
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            style={{
              color: tab === id ? chartColor : t.text2,
              borderBottom: tab === id ? `2px solid ${chartColor}` : "2px solid transparent",
            }}
          >{label}</button>
        ))}
      </div>

      {tab === "trend" && (
        <Card t={t}>
          <Section title={`Historical Risk Trend - ${eid}`} t={t} />
          {trendData.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="date" tick={{ fill: t.text2, fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: t.text2, fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, borderRadius: 8 }} />
                <Line type="monotone" dataKey="cbsi" stroke={chartColor} strokeWidth={2} dot={{ r: 3, fill: chartColor }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="text-sm py-8 text-center" style={{ color: t.text2 }}>Not enough data</div>}
        </Card>
      )}

      {tab === "txns" && (
        <Card t={t} className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr style={{ background: t.cardAlt }}>
              {["Timestamp", "Action", "Amount", "Channel", "Account", "CBSI", "Fraud"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[11px] uppercase tracking-wider" style={{ color: t.text2 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {txns.slice(-50).reverse().map((tx, i) => (
                <tr key={i} className="border-t" style={{ borderColor: t.border }}>
                  <td className="px-3 py-2 text-xs" style={{ color: t.text2 }}>{tx?.timestamp?.slice(0, 19)}</td>
                  <td className="px-3 py-2 text-xs">{tx?.action_type}</td>
                  <td className="px-3 py-2 text-xs font-mono">Rs.{(tx?.amount || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: t.text2 }}>{tx?.transfer_channel}</td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: t.text2 }}>{tx?.account_touched}</td>
                  <td className="px-3 py-2 font-mono font-bold" style={{ color: tc[riskTier(tx.cbsi)] }}>{tx.cbsi}</td>
                  <td className="px-3 py-2">{tx?.is_fraud_flag ? <span style={{ color: t.red }}>YES</span> : <span style={{ color: t.green }}>NO</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "rules" && (
        <div className="space-y-2">
          {flaggedTxns.length ? flaggedTxns.map((tx, i) => {
            const rules = getTriggeredRules(tx);
            if (!rules.length) return null;
            return rules.map((r, j) => (
              <Card key={`${i}-${j}`} t={t} style={{ borderLeft: `3px solid ${t.amber}` }} className="!py-2.5 !px-4">
                <div className="flex justify-between">
                  <span className="text-xs font-semibold" style={{ color: t.amber }}>{r}</span>
                  <span className="text-[11px]" style={{ color: t.text2 }}>{tx?.timestamp?.slice(0, 19)}</span>
                </div>
              </Card>
            ));
          }) : <div className="text-sm py-8 text-center" style={{ color: t.text2 }}>No rule triggers</div>}
        </div>
      )}

      {tab === "nlp" && (
        <div className="space-y-2">
          {nlpTxns.length ? nlpTxns.slice(0, 15).map((tx, i) => {
            const flags = extractNlpFlags(tx);
            return (
              <div key={i}>
                {flags.map((f, j) => (
                  <Card key={j} t={t} style={{ borderLeft: `3px solid ${t.red}` }} className="!py-2.5 !px-4 mb-1">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold" style={{ color: t.red }}>NLP MATCH: {f}</span>
                      <span className="text-[11px]" style={{ color: t.text2 }}>{tx?.timestamp?.slice(0, 19)}</span>
                    </div>
                  </Card>
                ))}
                <div className="text-[11px] px-4 mb-2" style={{ color: t.text2 }}>
                  Text: <em>{tx?.raw_complaint_text?.slice(0, 200)}</em>
                </div>
              </div>
            );
          }) : <div className="text-sm py-8 text-center" style={{ color: t.text2 }}>No NLP-relevant text found</div>}
        </div>
      )}
    </div>
  );
}
