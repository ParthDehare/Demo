import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { X, AlertTriangle, Clock, Shield, Zap, Radio, Search } from "lucide-react";

const generateGraphData = (targetEmp) => {
  const STANDARD_NODES = Array.from({ length: 28 }, (_, i) => ({
    id: `NODE_${String(i + 1).padStart(3, "0")}`,
    type: "standard",
    val: Math.random() * 3 + 1,
  }));

  const SPECIAL_NODES = [
    { id: targetEmp, type: "attacker", label: targetEmp, val: 8 },
    { id: "ACC_GHOST_07", type: "honeypot", label: "ACC_GHOST_07", val: 6 },
  ];

  const ALL_NODES = [...STANDARD_NODES, ...SPECIAL_NODES];

  const STANDARD_EDGES = Array.from({ length: 42 }, (_, i) => {
    const src = STANDARD_NODES[Math.floor(Math.random() * STANDARD_NODES.length)];
    const tgt = STANDARD_NODES[Math.floor(Math.random() * STANDARD_NODES.length)];
    return src.id !== tgt.id
      ? { id: `edge_std_${i}`, source: src.id, target: tgt.id, type: "standard" }
      : null;
  }).filter(Boolean);

  const ATTACKER_STD_EDGES = [2, 7, 14, 19].map((idx, i) => ({
    id: `edge_atk_std_${i}`,
    source: targetEmp,
    target: STANDARD_NODES[idx].id,
    type: "attacker_std",
  }));

  const BREACH_EDGE = {
    id: "edge_breach",
    source: targetEmp,
    target: "ACC_GHOST_07",
    type: "breach",
  };

  const ALL_LINKS = [...STANDARD_EDGES, ...ATTACKER_STD_EDGES, BREACH_EDGE];

  return { nodes: ALL_NODES, links: ALL_LINKS };
};

// ── Incident Timeline ────────────────────────────────────────────────────────
const TIMELINE = [
  {
    time: "01:58 AM",
    title: "Anomalous Login Detected",
    detail: "EMP_1024 authenticated from IP 185.220.101.47 — Tor exit node. Location: outside India.",
    icon: "radio",
    severity: "warn",
  },
  {
    time: "02:00 AM",
    title: "Off-Hours Access Window",
    detail: "Login at 02:00 IST — 6 hours outside approved access window (08:00–20:00). BehaviourWatch Agent 1 flags CBSI +28 pts.",
    icon: "clock",
    severity: "warn",
  },
  {
    time: "02:15 AM",
    title: "Internal Port Scan Initiated",
    detail: "4,847 sequential DB_Read calls to internal subnet 10.13.x.x detected. Records accessed: 4,847 — 42× above CLERK peer average.",
    icon: "zap",
    severity: "high",
  },
  {
    time: "02:17 AM",
    title: "Honeypot Contact — ACC_GHOST_07",
    detail: "Direct UI access to decoy account ACC_GHOST_07 (Honey Balance: ₹8,00,000). Dwell time: 12.4 seconds. Session type: HUMAN. DeceptionGuard fires.",
    icon: "shield",
    severity: "critical",
  },
  {
    time: "02:18 AM",
    title: "Orchestrator Correlation",
    detail: "3 agents cross-correlated simultaneously: BehaviourWatch (92) + DeceptionGuard (100) + NetworkIntel (88). Unified CBSI → 100.",
    icon: "alert",
    severity: "critical",
  },
  {
    time: "02:25 AM",
    title: "CBSI Score: 100 — Isolation Active",
    detail: "SHA-256 evidence anchored on block #47. STR auto-filed to FIU-IND. Access privileges suspended pending FCU review. Tier-2 escalation triggered.",
    icon: "alert",
    severity: "terminal",
  },
];

const SEVERITY_STYLES = {
  warn:     { dot: "bg-amber-400",  text: "text-amber-400",  border: "border-amber-400/30" },
  high:     { dot: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/30" },
  critical: { dot: "bg-red-500",    text: "text-red-400",    border: "border-red-500/40" },
  terminal: { dot: "bg-red-600 animate-pulse", text: "text-red-300", border: "border-red-600/60" },
};

const IconMap = { radio: Radio, clock: Clock, zap: Zap, shield: Shield, alert: AlertTriangle };

// ── Panel ────────────────────────────────────────────────────────────────────
function IncidentPanel({ target, targetEmp, onClose, onGenerateEvidence }) {
  const [pdfState, setPdfState] = useState("idle");
  const [strState, setStrState] = useState("idle");

  const isEdge    = target?.type === "breach";
  const isHoneypot = target?.id === "ACC_GHOST_07";

  const title = isEdge
    ? `BREACH EDGE — ${targetEmp} → ACC_GHOST_07`
    : isHoneypot
    ? "HONEYPOT TRIGGERED — ACC_GHOST_07"
    : `ATTACKER PROFILE — ${targetEmp}`;

  return (
    <div
      className="fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col"
      style={{
        background: "#0e0e0e",
        borderLeft: "1px solid rgba(239,68,68,0.25)",
        boxShadow: "-8px 0 40px rgba(239,68,68,0.08)",
        animation: "slideIn 0.28s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-red-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase">
              Incident Storytelling
            </span>
          </div>
          <h2 className="text-sm font-mono text-white leading-snug">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Meta strip */}
      <div className="grid grid-cols-3 gap-px border-b border-white/5">
        {[
          ["CBSI", "100"],
          ["TIER", "Tier-3"],
          ["STATUS", "Isolated"],
        ].map(([k, v]) => (
          <div key={k} className="p-3 bg-[#111]">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">{k}</p>
            <p className="text-xs font-mono text-red-400 font-medium">{v}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-5 space-y-0">
        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-4">
          Breach Timeline — 15 Mar 2026
        </p>
        {TIMELINE.map((evt, idx) => {
          const s   = SEVERITY_STYLES[evt.severity];
          const Icon = IconMap[evt.icon] || AlertTriangle;
          const isLast = idx === TIMELINE.length - 1;
          return (
            <div key={idx} className="relative flex gap-4">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className="absolute left-[18px] top-8 bottom-0 w-px"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
              )}
              {/* Icon dot */}
              <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${s.border}`}
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <Icon size={14} className={s.text} />
              </div>
              {/* Content */}
              <div className={`pb-5 flex-1 ${isLast ? "" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-mono ${s.text}`}>{evt.time}</span>
                  {evt.severity === "terminal" && (
                    <span className="text-[9px] font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded tracking-wider">
                      CONFIRMED FRAUD
                    </span>
                  )}
                </div>
                <p className="text-xs text-white font-medium mb-1 leading-tight">{evt.title}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">{evt.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="p-4 pb-12 border-t border-white/5 flex gap-2">
        <button
          onClick={() => {
            if (pdfState !== "idle") return;
            setPdfState("loading");
            if (onGenerateEvidence) onGenerateEvidence(targetEmp);
            setTimeout(() => setPdfState("done"), 1500);
          }}
          className={`flex-1 py-2 text-xs font-mono border rounded transition-colors ${
            pdfState === "done" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
              : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/25"
          }`}
        >
          {pdfState === "idle" && "Generate Evidence PDF"}
          {pdfState === "loading" && "Generating..."}
          {pdfState === "done" && "[ PDF GENERATED ]"}
        </button>
        <button
          onClick={() => {
            if (strState !== "idle") return;
            setStrState("loading");
            if (onGenerateEvidence) onGenerateEvidence(targetEmp);
            setTimeout(() => setStrState("done"), 1500);
          }}
          className={`flex-1 py-2 text-xs font-mono border rounded transition-colors ${
            strState === "done"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
          }`}
        >
          {strState === "idle" && "File STR to FIU-IND"}
          {strState === "loading" && "Transmitting..."}
          {strState === "done" && "[ STR FILED ]"}
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Node Renderer ─────────────────────────────────────────────────────────────
function drawNode(node, ctx, globalScale, hoveredId, targetEmp) {
  if (typeof node.x !== 'number' || typeof node.y !== 'number' || isNaN(node.x) || isNaN(node.y)) return;

  const isAttacker  = node.id === targetEmp;
  const isHoneypot  = node.id === "ACC_GHOST_07";
  const isHovered   = node.id === hoveredId;
  const r           = node.val * 2;

  ctx.save();

  if (isAttacker) {
    // Glow
    const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3.5);
    grd.addColorStop(0, "rgba(220,38,38,0.35)");
    grd.addColorStop(1, "rgba(220,38,38,0)");
    ctx.beginPath();
    ctx.arc(node.x, node.y, r * 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = grd;
    ctx.fill();
    // Core
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = isHovered ? "#ff4444" : "#dc2626";
    ctx.fill();
    // Ring
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 2.5, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(220,38,38,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Label
    ctx.font = `bold ${Math.max(4, 8 / globalScale)}px monospace`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(targetEmp, node.x, node.y + r + 8 / globalScale);
  } else if (isHoneypot) {
    // Glow
    const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3.5);
    grd.addColorStop(0, "rgba(234,179,8,0.3)");
    grd.addColorStop(1, "rgba(234,179,8,0)");
    ctx.beginPath();
    ctx.arc(node.x, node.y, r * 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = grd;
    ctx.fill();
    // Core — gold diamond shape
    ctx.beginPath();
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = isHovered ? "#fde047" : "#eab308";
    const s = r * 0.85;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
    // Ring
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(234,179,8,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Label
    ctx.font = `bold ${Math.max(4, 7 / globalScale)}px monospace`;
    ctx.fillStyle = "#eab308";
    ctx.textAlign = "center";
    ctx.fillText("HONEYPOT", node.x, node.y + r + 8 / globalScale);
    ctx.fillText("ACC_GHOST_07", node.x, node.y + r + 16 / globalScale);
  } else {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = isHovered
      ? "rgba(255,255,255,0.9)"
      : "rgba(255,255,255,0.55)";
    ctx.fill();
  }

  ctx.restore();
}

// ── Link Renderer ─────────────────────────────────────────────────────────────
function drawLink(link, ctx, hoveredLinkId) {
  const isBreach  = link.id === "edge_breach";
  const isAtkStd  = link.type === "attacker_std";
  const isHovered = link.id === hoveredLinkId;

  ctx.save();
  ctx.beginPath();

  const sx = link.source.x ?? 0;
  const sy = link.source.y ?? 0;
  const tx = link.target.x ?? 0;
  const ty = link.target.y ?? 0;

  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);

  if (isBreach) {
    ctx.strokeStyle = isHovered ? "#ff2222" : "#dc2626";
    ctx.lineWidth   = isHovered ? 3 : 2.2;
    ctx.shadowColor = "#dc2626";
    ctx.shadowBlur  = 10;
    ctx.setLineDash([]);
  } else if (isAtkStd) {
    ctx.strokeStyle = "rgba(220,38,38,0.28)";
    ctx.lineWidth   = 0.8;
    ctx.setLineDash([3, 4]);
  } else {
    ctx.strokeStyle = isHovered
      ? "rgba(255,255,255,0.4)"
      : "rgba(255,255,255,0.1)";
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([]);
  }

  ctx.stroke();
  ctx.restore();
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FundFlowGraph({ onGenerateEvidence }) {
  const graphRef       = useRef(null);
  const [panel, setPanel]         = useState(null);
  const [hoveredNode, setHovered] = useState(null);
  const [hoveredLink, setHovLink] = useState(null);
  const [dims, setDims]           = useState({ w: window.innerWidth, h: window.innerHeight });
  const [targetEmp, setTargetEmp] = useState("EMP_1024");
  const [searchVal, setSearchVal] = useState("");

  const graphData = useMemo(() => generateGraphData(targetEmp), [targetEmp]);

  useEffect(() => {
    const handle = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  useEffect(() => {
    if (!graphRef.current) return;
    // Slightly weaker link force so cluster stays readable
    graphRef.current.d3Force("link").distance(() => 60);
    graphRef.current.d3Force("charge").strength(-120);
  }, []);

  const handleNodeClick = useCallback((node) => {
    if (node.id === targetEmp || node.id === "ACC_GHOST_07") {
      setPanel(node);
    }
  }, [targetEmp]);

  const handleLinkClick = useCallback((link) => {
    if (link.id === "edge_breach") {
      setPanel(link);
    }
  }, []);

  const handleNodeHover  = useCallback((n) => setHovered(n?.id ?? null), []);
  const handleLinkHover  = useCallback((l) => setHovLink(l?.id ?? null), []);

  const nodePainter = useCallback(
    (node, ctx, scale) => drawNode(node, ctx, scale, hoveredNode, targetEmp),
    [hoveredNode, targetEmp]
  );

  const linkPainter = useCallback(
    (link, ctx) => drawLink(link, ctx, hoveredLink),
    [hoveredLink]
  );

  const linkColor = useCallback((link) => {
    if (link.id === "edge_breach")   return "#dc2626";
    if (link.type === "attacker_std") return "rgba(220,38,38,0.25)";
    return "rgba(255,255,255,0.1)";
  }, []);

  const getCursor = useCallback((obj) => {
    if (!obj) return "default";
    if (obj.id === targetEmp || obj.id === "ACC_GHOST_07") return "pointer";
    if (obj.id === "edge_breach") return "pointer";
    return "default";
  }, [targetEmp]);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0a0a0a" }}>

      {/* Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dims.w}
        height={dims.h}
        backgroundColor="#0a0a0a"
        nodeCanvasObject={nodePainter}
        nodeCanvasObjectMode={() => "replace"}
        linkCanvasObject={linkPainter}
        linkCanvasObjectMode={() => "replace"}
        linkColor={linkColor}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, (node.val ?? 1) * 2 + 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        enableNodeDrag
        enableZoomInteraction
        cooldownTicks={120}
      />

      {/* HUD — top left */}
      <div className="absolute top-5 left-5 pointer-events-none select-none z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-mono text-red-400 tracking-widest uppercase">
            VaultMind — Fund Flow Network (Agent 2)
          </span>
        </div>
        <p className="text-[10px] font-mono text-slate-600 mb-4">
          {graphData.nodes.length} nodes · {graphData.links.length} edges · 1 breach detected
        </p>

        {/* Search Bar */}
        <div className="pointer-events-auto flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search Employee..." 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchVal.trim()) {
                  setTargetEmp(searchVal.trim().toUpperCase());
                }
              }}
              className="pl-8 pr-3 py-2 text-xs font-mono bg-black/40 border border-white/10 rounded text-white focus:outline-none focus:border-red-500/50 w-48"
            />
          </div>
          <button 
            onClick={() => {
              if (searchVal.trim()) {
                setTargetEmp(searchVal.trim().toUpperCase());
              }
            }}
            className="px-3 py-2 text-xs font-mono bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Legend — bottom left */}
      <div
        className="absolute bottom-5 left-5 p-3 rounded pointer-events-none select-none"
        style={{ background: "rgba(10,10,10,0.85)", border: "0.5px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">Legend</p>
        {[
          { color: "#dc2626", shape: "●", label: `Attacker node (${targetEmp})` },
          { color: "#eab308", shape: "◆", label: "Honeypot (ACC_GHOST_07)" },
          { color: "rgba(255,255,255,0.55)", shape: "●", label: "Standard node" },
          { color: "#dc2626", shape: "─", label: "Breach edge" },
          { color: "rgba(255,255,255,0.2)", shape: "─", label: "Normal flow" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 mb-1">
            <span style={{ color: item.color, fontSize: 12 }}>{item.shape}</span>
            <span className="text-[10px] font-mono text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Hint */}
      {!panel && (
        <div
          className="absolute bottom-5 right-5 px-3 py-2 rounded text-[10px] font-mono text-slate-500 pointer-events-none select-none"
          style={{ background: "rgba(10,10,10,0.8)", border: "0.5px solid rgba(255,255,255,0.07)" }}
        >
          Click red node, gold node, or red edge to open incident panel
        </div>
      )}

      {/* Incident Panel */}
      {panel && (
        <IncidentPanel 
          target={panel} 
          targetEmp={targetEmp}
          onClose={() => setPanel(null)} 
          onGenerateEvidence={onGenerateEvidence}
        />
      )}
    </div>
  );
}