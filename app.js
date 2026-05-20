// ============================================================
// VAULTMIND 2.0 — app.js
// ============================================================

const EMPLOYEES = [
  { emp_id:"EMP_1001", emp_class:"CLERK",    branch_id:"BR_05", cbsi:96, login_hour:2,  records_accessed:4847, amount:8500000, action_type:"Approve",  off_hours_flag:1, dwell_time:1.2,   peer_avg_records:115, signals:["Off-hours login 02:47","Records 42x above peer avg","Clerk executed Approve","Mirage account access"], trajectory:[22,24,21,25,28,26,30,33,35,38,36,40,44,47,50,53,58,61,65,68,71,75,78,81,85,88,90,93,95,96], network_links:["MGR_2041","ACC-MIRAGE-001","EXT_ACC_881"], alert_id:"EVD-2026-0001" },
  { emp_id:"EMP_1219", emp_class:"CLERK",    branch_id:"BR_10", cbsi:88, login_hour:20, records_accessed:2100, amount:50000000, action_type:"Initiate", off_hours_flag:1, dwell_time:30,    peer_avg_records:115, signals:["Collusion with MGR EMP_1193","?5Cr transaction","Speed: 40s approval"], trajectory:[20,22,21,24,26,28,30,32,35,38,41,44,48,51,55,58,62,64,67,70,73,75,78,80,82,84,85,86,87,88], network_links:["EMP_1193","ACC_5021","ACC_5022"], alert_id:"EVD-2026-0002" },
  { emp_id:"EMP_1302", emp_class:"CLERK",    branch_id:"BR_08", cbsi:82, login_hour:22, records_accessed:180,  amount:15000000, action_type:"Approve",  off_hours_flag:1, dwell_time:4.0,   peer_avg_records:115, signals:["Privilege escalation","Night access 22:00","Manager-level approval by Clerk"], trajectory:[18,20,19,22,25,27,29,32,35,38,42,45,49,52,56,59,62,65,68,71,73,75,77,78,79,80,81,81,82,82], network_links:["ACC_8821","EXT_IP_92"], alert_id:"EVD-2026-0003" },
  { emp_id:"EMP_1047", emp_class:"MANAGER",  branch_id:"BR_12", cbsi:68, login_hour:19, records_accessed:95,   amount:2500000,  action_type:"Approve",  off_hours_flag:0, dwell_time:45,    peer_avg_records:32,  signals:["Records 3x above peer avg","Late evening access pattern"], trajectory:[18,20,22,21,24,26,28,30,32,35,36,38,40,42,44,46,48,50,52,54,56,58,60,62,63,64,65,66,67,68], network_links:[], alert_id:"EVD-2026-0004" },
  { emp_id:"EMP_1089", emp_class:"CLERK",    branch_id:"BR_12", cbsi:62, login_hour:17, records_accessed:185,  amount:49800,    action_type:"Initiate", off_hours_flag:0, dwell_time:60,    peer_avg_records:115, signals:["Structuring: 6 txns just below ?50k threshold"], trajectory:[15,17,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,57,58,59,60,61,61,62,62], network_links:[], alert_id:"EVD-2026-0005" },
  { emp_id:"EMP_2041", emp_class:"MANAGER",  branch_id:"BR_03", cbsi:22, login_hour:10, records_accessed:28,   amount:750000,   action_type:"Approve",  off_hours_flag:0, dwell_time:180,   peer_avg_records:32,  signals:[], trajectory:[20,22,21,23,22,24,21,22,23,22,21,24,22,23,21,22,24,22,23,21,22,23,21,22,23,22,21,23,22,22], network_links:[], alert_id:null },
  { emp_id:"EMP_2199", emp_class:"CLERK",    branch_id:"BR_07", cbsi:18, login_hour:9,  records_accessed:105,  amount:45000,    action_type:"Initiate", off_hours_flag:0, dwell_time:120,   peer_avg_records:115, signals:[], trajectory:[18,19,17,20,18,19,17,18,20,19,18,17,19,18,20,17,19,18,17,19,18,20,18,17,19,18,19,17,18,18], network_links:[], alert_id:null },
  { emp_id:"EMP_3007", emp_class:"IT_ADMIN", branch_id:"BR_01", cbsi:12, login_hour:2,  records_accessed:65000, amount:0,       action_type:"DB_Read",  off_hours_flag:1, dwell_time:0.005, peer_avg_records:52000, signals:[], trajectory:[12,11,13,12,11,12,13,11,12,13,12,11,12,13,12,11,13,12,11,12,13,12,11,12,13,12,11,12,12,12], network_links:[], alert_id:null }
];

const PAGE_TITLES = {
  "page-command":"Command Centre","page-employees":"Employee Watch","page-fundflow":"FundFlow Graph",
  "page-deception":"DeceptionGuard","page-evidence":"Evidence Reports","page-precrime":"Pre-Crime Forecast"
};

// -- ROUTER --------------------------------------------------
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => { p.style.display="none"; p.classList.remove("active"); });
  const pg = document.getElementById(pageId);
  pg.style.display = "flex"; pg.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  document.querySelector(`[data-page="${pageId}"]`).classList.add("active");
  document.getElementById("page-title").textContent = PAGE_TITLES[pageId] || pageId;
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", e => { e.preventDefault(); showPage(link.dataset.page); });
});

// -- UTILITIES ------------------------------------------------
function scoreColor(s) { return s>=70?"#DC2626":s>=40?"#D97706":"#16A34A"; }
function scoreBadgeClass(s) { return s>=70?"crit":s>=40?"high":"low"; }
function scoreLabel(s) { return s>=70?"CRITICAL":s>=40?"WATCH":"COMPLIANT"; }
function fmtAmt(n) { if(n>=10000000) return "?"+(n/10000000).toFixed(1)+"Cr"; if(n>=100000) return "?"+(n/100000).toFixed(1)+"L"; return "?"+n.toLocaleString("en-IN"); }
function timeAgo(ms) { const s=Math.floor((Date.now()-ms)/1000); if(s<60) return s+"s ago"; if(s<3600) return Math.floor(s/60)+"m ago"; return Math.floor(s/3600)+"h ago"; }
function genHash() { return Array.from({length:16},()=>Math.floor(Math.random()*16).toString(16)).join(""); }

// -- TICKER ---------------------------------------------------
function buildTicker() {
  const items = [
    { cls:"t-alert", txt:"?? CRITICAL: EMP_1001 accessed Mirage account ACC-MIRAGE-001 at 02:47 — Escalated" },
    { cls:"t-warn",  txt:"?? HIGH: EMP_1219 initiated ?5Cr transfer — Collusion pattern detected with MGR EMP_1193" },
    { cls:"t-alert", txt:"?? CRITICAL: EMP_1302 executed Manager-level approval — Privilege escalation confirmed" },
    { cls:"t-warn",  txt:"?? WATCH: EMP_1047 records 3x above peer average for 7 consecutive days" },
    { cls:"t-warn",  txt:"?? MEDIUM: EMP_1089 structuring pattern — 6 transactions just below ?50,000 threshold" },
    { cls:"",        txt:"? Block #47 confirmed — SHA-256: a3f8c2e1d4b7... verified on distributed ledger" },
    { cls:"",        txt:"?? STR filed to FIU-IND for EMP_1001 — Reference: STR-2026-0312" },
    { cls:"t-alert", txt:"?? ALERT: Off-hours database access detected — BR_05 — Initiating automated response" }
  ];
  const el = document.getElementById("ticker-content");
  const html = [...items,...items].map(i=>`<span class="ticker-item"><span class="${i.cls}">${i.txt}</span></span>`).join("");
  el.innerHTML = html;
}

// -- ALERT FEED -----------------------------------------------
const alertTimestamps = {};
const FRAUD_EMPS = EMPLOYEES.filter(e=>e.cbsi>=70);

function renderAlertFeed() {
  const feed = document.getElementById("alert-feed");
  if(!feed) return;
  const alerts = FRAUD_EMPS.concat(EMPLOYEES.filter(e=>e.cbsi>=40&&e.cbsi<70));
  feed.innerHTML = "";
  alerts.forEach(emp => {
    if(!alertTimestamps[emp.emp_id]) alertTimestamps[emp.emp_id]=Date.now()-Math.random()*600000;
    const cls = emp.cbsi>=70?"critical":emp.cbsi>=40?"high":"medium";
    const bc = scoreColor(emp.cbsi);
    const card = document.createElement("div");
    card.className = `alert-card ${cls}`;
    card.setAttribute("data-empid", emp.emp_id);
    card.innerHTML = `
      <div class="score-badge ${scoreBadgeClass(emp.cbsi)}">${emp.cbsi}</div>
      <div class="alert-card-inner">
        <div class="alert-emp">${emp.emp_id} &nbsp;·&nbsp; ${emp.emp_class} &nbsp;·&nbsp; ${emp.branch_id}</div>
        <div class="alert-signal">${emp.signals[0]||"Standard activity pattern"}</div>
        <div class="alert-time"><i class="fa-regular fa-clock"></i> ${timeAgo(alertTimestamps[emp.emp_id])}</div>
        <div class="alert-actions">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openEmployeeSlide('${emp.emp_id}')">Investigate ?</button>
          <span class="stat-badge ${emp.cbsi>=70?"badge-red":emp.cbsi>=40?"badge-amber":"badge-green"}">${scoreLabel(emp.cbsi)}</span>
        </div>
      </div>`;
    card.addEventListener("click", ()=>openEmployeeSlide(emp.emp_id));
    feed.appendChild(card);
  });
}

// -- THREAT GAUGE ---------------------------------------------
let threatChart = null;
function renderThreatGauge() {
  const ctx = document.getElementById("threat-gauge");
  if(!ctx) return;
  if(threatChart) threatChart.destroy();
  threatChart = new Chart(ctx, {
    type:"doughnut",
    data:{ datasets:[{ data:[73,27], backgroundColor:["#DC2626","#F1F5F9"], borderWidth:0, circumference:270, rotation:225 }] },
    options:{ cutout:"75%", plugins:{ legend:{display:false}, tooltip:{enabled:false} }, animation:{duration:1000} }
  });
}

// -- SPARKLINE ------------------------------------------------
function drawSparkline(canvas, data) {
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const pts = data.slice(-7);
  const mn=Math.min(...pts), mx=Math.max(...pts)+1;
  const rising = pts[pts.length-1]>pts[0];
  ctx.beginPath();
  ctx.strokeStyle = rising ? "#DC2626" : "#16A34A";
  ctx.lineWidth = 2;
  pts.forEach((v,i)=>{
    const x = (i/(pts.length-1))*(w-4)+2;
    const y = h-2 - ((v-mn)/(mx-mn))*(h-4);
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.stroke();
}

// -- EMPLOYEE TABLE -------------------------------------------
let filteredEmps = [...EMPLOYEES];
function filterEmployees() {
  const q = document.getElementById("emp-search")?.value.toLowerCase()||"";
  const sort = document.getElementById("emp-sort")?.value||"";
  const flt = document.getElementById("emp-filter")?.value||"";
  filteredEmps = EMPLOYEES.filter(e=>{
    const matchQ = !q || e.emp_id.toLowerCase().includes(q)||e.branch_id.toLowerCase().includes(q)||e.emp_class.toLowerCase().includes(q);
    const matchF = !flt || (flt==="critical"&&e.cbsi>=70)||(flt==="watch"&&e.cbsi>=40&&e.cbsi<70)||(flt==="normal"&&e.cbsi<40);
    return matchQ && matchF;
  });
  if(sort==="cbsi-desc") filteredEmps.sort((a,b)=>b.cbsi-a.cbsi);
  else if(sort==="cbsi-asc") filteredEmps.sort((a,b)=>a.cbsi-b.cbsi);
  else if(sort==="id") filteredEmps.sort((a,b)=>a.emp_id.localeCompare(b.emp_id));
  renderEmpTable();
}

function renderEmpTable() {
  const tbody = document.getElementById("emp-tbody");
  const countEl = document.getElementById("emp-count");
  if(!tbody) return;
  if(countEl) countEl.textContent = filteredEmps.length+" employees";
  tbody.innerHTML = filteredEmps.map(emp=>{
    const sc = emp.cbsi; const c = scoreColor(sc); const bc = scoreBadgeClass(sc);
    const sig = emp.signals[0]||"—";
    const status = sc>=70?"CRITICAL":sc>=40?"ELEVATED":"NORMAL";
    const sbadge = sc>=70?"badge-red":sc>=40?"badge-amber":"badge-green";
    return `<tr data-empid="${emp.emp_id}" onclick="openEmployeeSlide('${emp.emp_id}')">
      <td><strong>${emp.emp_id}</strong></td>
      <td>${emp.emp_class}</td>
      <td>${emp.branch_id}</td>
      <td>
        <div class="cbsi-bar">
          <div class="cbsi-fill" style="width:${sc}px;background:${c};max-width:80px"></div>
          <span class="inline-score" style="color:${c}">${sc}</span>
        </div>
      </td>
      <td><canvas width="60" height="24" id="spark-${emp.emp_id}"></canvas></td>
      <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text2);font-size:12px">${sig}</td>
      <td><span class="stat-badge ${sbadge}">${status}</span></td>
      <td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openEmployeeSlide('${emp.emp_id}')">View ?</button></td>
    </tr>`;
  }).join("");
  filteredEmps.forEach(emp => drawSparkline(document.getElementById(`spark-${emp.emp_id}`), emp.trajectory));
}

// -- FUNDFLOW NETWORK -----------------------------------------
let fundflowNet = null;
function renderFundflowNetwork() {
  const container = document.getElementById("fundflow-network");
  if(!container || fundflowNet) return;
  const nodes = new vis.DataSet();
  const edges = new vis.DataSet();
  const addedNodes = new Set();
  const addNode = (id, label, color, size, shape="dot") => {
    if(!addedNodes.has(id)) { nodes.add({id,label,color:{background:color,border:color},size,shape,font:{color:"#0F172A",size:11,bold:true}}); addedNodes.add(id); }
  };
  FRAUD_EMPS.forEach(emp => {
    addNode(emp.emp_id, emp.emp_id+"\n"+emp.emp_class, "#DC2626", 28);
    emp.network_links.forEach(link => {
      const isMirage = link.includes("MIRAGE");
      const isExt = link.includes("EXT")||link.includes("ACC_");
      const isMgr = link.startsWith("EMP_")||link.startsWith("MGR_");
      const color = isMirage?"#F59E0B":isExt?"#7C3AED":isMgr?"#D97706":"#64748B";
      const shape = isMirage?"star":isExt?"hexagon":"dot";
      const lbl = isMirage?"HONEYPOT":isExt?"External":link;
      addNode(link, lbl, color, isMirage?22:18, shape);
      edges.add({from:emp.emp_id, to:link, color:{color:color}, width:2, dashes:isMirage, arrows:{to:{enabled:true,scaleFactor:0.8}}, label:isMirage?"TRAP":"?", font:{size:9,color:"#64748B"}});
    });
  });
  const data = {nodes, edges};
  const options = {
    physics:{enabled:true,stabilization:{iterations:100}},
    interaction:{hover:true,tooltipDelay:200},
    nodes:{borderWidth:2,shadow:true},
    edges:{smooth:{type:"curvedCW",roundness:0.2}},
    height:"100%"
  };
  fundflowNet = new vis.Network(container, data, options);
  // Legend
  const legend = document.getElementById("fundflow-legend");
  if(legend) legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#DC2626"></div>Fraud Employee</div>
    <div class="legend-item"><div class="legend-dot" style="background:#D97706"></div>Manager Link</div>
    <div class="legend-item"><div class="legend-dot" style="background:#F59E0B"></div>Honeypot Acct</div>
    <div class="legend-item"><div class="legend-dot" style="background:#7C3AED"></div>External Account</div>`;
}

// -- DECEPTIONGUARD -------------------------------------------
const MIRAGE_ACCOUNTS = [
  {id:"ACC-MIRAGE-001",type:"Savings",branch:"BR_05",accesses:4,triggered:true},
  {id:"ACC-MIRAGE-002",type:"Current",branch:"BR_02",accesses:0,triggered:false},
  {id:"ACC-MIRAGE-003",type:"Savings",branch:"BR_08",accesses:1,triggered:false},
  {id:"ACC-MIRAGE-004",type:"Loan",branch:"BR_10",accesses:0,triggered:false},
  {id:"ACC-MIRAGE-005",type:"Fixed",branch:"BR_12",accesses:2,triggered:false},
  {id:"ACC-MIRAGE-006",type:"Savings",branch:"BR_01",accesses:0,triggered:false},
  {id:"ACC-MIRAGE-007",type:"Current",branch:"BR_07",accesses:0,triggered:false},
  {id:"ACC-MIRAGE-008",type:"Savings",branch:"BR_03",accesses:0,triggered:false},
  {id:"ACC-MIRAGE-009",type:"Loan",branch:"BR_09",accesses:1,triggered:false},
  {id:"ACC-MIRAGE-010",type:"Fixed",branch:"BR_06",accesses:0,triggered:false}
];
const ACCESS_LOG = [
  {time:"02:47:33",emp:"EMP_1001",acct:"ACC-MIRAGE-001",action:"READ",branch:"BR_05"},
  {time:"Yesterday 14:22",emp:"EMP_1302",acct:"ACC-MIRAGE-003",action:"READ",branch:"BR_08"},
  {time:"2d ago 09:15",emp:"EMP_1089",acct:"ACC-MIRAGE-009",action:"READ",branch:"BR_12"},
  {time:"2d ago 11:30",emp:"EMP_1001",acct:"ACC-MIRAGE-001",action:"READ",branch:"BR_05"},
  {time:"3d ago 16:44",emp:"EMP_1047",acct:"ACC-MIRAGE-005",action:"READ",branch:"BR_12"},
  {time:"3d ago 08:12",emp:"EMP_1047",acct:"ACC-MIRAGE-005",action:"READ",branch:"BR_12"}
];

function renderDeceptionGuard() {
  const grid = document.getElementById("mirage-grid");
  if(!grid) return;
  grid.innerHTML = MIRAGE_ACCOUNTS.map(a=>`
    <div class="mirage-card${a.triggered?" triggered":""}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:13px;font-weight:700;color:var(--text1)">${a.id}</div>
        <div class="stat-badge ${a.triggered?"badge-red":"badge-green"}">${a.triggered?"TRIGGERED":"SILENT"}</div>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:4px">${a.type} · ${a.branch}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px"><i class="fa-solid fa-eye"></i> ${a.accesses} access attempt${a.accesses!==1?"s":""}</div>
      <button class="btn btn-sm ${a.triggered?"btn-red":"btn-outline"}" style="width:100%" onclick="triggerMirage('${a.id}')"><i class="fa-solid fa-crosshairs"></i> ${a.triggered?"Alert Active":"Trigger Trap"}</button>
    </div>`).join("");
  const log = document.getElementById("access-log");
  if(log) log.innerHTML = ACCESS_LOG.map(l=>`
    <div class="log-item">
      <div class="log-time">${l.time}</div>
      <div style="font-weight:600;color:var(--text1);font-size:13px;margin:2px 0">${l.emp} ? ${l.acct}</div>
      <div style="font-size:11px;color:var(--text2)">${l.action} · ${l.branch}</div>
    </div>`).join("");
}

function triggerMirage(id) {
  showToast("Mirage Trap Activated",`${id} is now hot. Any access attempt will be logged and escalated immediately.`,"amber");
}

// -- EVIDENCE REPORTS -----------------------------------------
function renderEvidence() {
  const stats = document.getElementById("ev-stats");
  if(stats) stats.innerHTML = `
    <div class="ev-stat"><div class="ev-stat-val">5</div><div class="ev-stat-label">Evidence Packages</div></div>
    <div class="ev-stat"><div class="ev-stat-val" style="color:var(--green)">5</div><div class="ev-stat-label">Blockchain Verified</div></div>
    <div class="ev-stat"><div class="ev-stat-val" style="color:var(--red)">3</div><div class="ev-stat-label">STR Ready</div></div>
    <div class="ev-stat"><div class="ev-stat-val" style="color:var(--amber)">2</div><div class="ev-stat-label">Pending Review</div></div>`;
  const tbody = document.getElementById("ev-tbody");
  if(!tbody) return;
  const pkgs = EMPLOYEES.filter(e=>e.alert_id);
  tbody.innerHTML = pkgs.map((e,i)=>{
    const hash = ["a3f8c2e1","d4b7f091","92c3e847","7f1a3d95","b8e2a401"][i];
    const status = e.cbsi>=70?"ESCALATED":e.cbsi>=40?"REVIEW":"LOGGED";
    const sbadge = e.cbsi>=70?"badge-red":e.cbsi>=40?"badge-amber":"badge-green";
    const dates = ["2026-03-15","2026-03-15","2026-03-14","2026-03-14","2026-03-13"];
    return `<tr>
      <td><span class="evidence-tag">${e.alert_id}</span></td>
      <td><strong>${e.emp_id}</strong></td>
      <td>${dates[i]} 02:47</td>
      <td>${e.cbsi>=70?"Full Forensic":e.cbsi>=40?"Watch Package":"Log Entry"}</td>
      <td><div class="hash-row"><span class="hash-val">${hash}...</span><button class="copy-btn" onclick="navigator.clipboard.writeText('${hash}')">Copy</button></div></td>
      <td><span class="stat-badge ${sbadge}">${status}</span></td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-primary btn-sm" onclick="showToast('Downloading','Evidence package for ${e.alert_id} queued','green')"><i class="fa-solid fa-download"></i></button>
        ${e.cbsi>=70?`<button class="btn btn-sm btn-outline" onclick="showToast('STR Filing','Preparing STR for FIU-IND...','amber')"><i class="fa-solid fa-file-export"></i></button>`:""}
      </td>
    </tr>`;
  }).join("");
}

// -- PRE-CRIME FORECAST ---------------------------------------
const sparkCharts = {};
function renderPreCrime() {
  const tbody = document.getElementById("precrime-tbody");
  if(!tbody) return;
  tbody.innerHTML = EMPLOYEES.map((emp,idx)=>{
    const delta = emp.cbsi>=70 ? Math.round(Math.random()*3+1) : emp.cbsi>=40 ? Math.round(Math.random()*4-1) : Math.round(Math.random()*2-1);
    const predicted = Math.min(99,Math.max(5,emp.cbsi+delta));
    const conf = [92,89,87,78,82,95,96,94][idx];
    const factor = emp.cbsi>=70?"Transaction velocity":"Access pattern";
    const dSign = delta>0?"+":"";
    const dc = delta>0?"var(--red)":delta<0?"var(--green)":"var(--text2)";
    return `<tr>
      <td><strong>${emp.emp_id}</strong> <span style="font-size:11px;color:var(--text2)">${emp.emp_class}</span></td>
      <td><span style="color:${scoreColor(emp.cbsi)};font-weight:700">${emp.cbsi}</span></td>
      <td><span style="color:${scoreColor(predicted)};font-weight:700">${predicted}</span></td>
      <td><span style="color:${dc};font-weight:700">${dSign}${delta}</span></td>
      <td><canvas id="pc-spark-${emp.emp_id}" width="80" height="24"></canvas></td>
      <td style="font-size:12px;color:var(--text2)">${factor}</td>
      <td>
        <div class="risk-meter"><div class="risk-fill" style="width:${conf}%;background:${conf>85?"var(--green)":conf>70?"var(--amber)":"var(--red)"}"></div></div>
        <div style="font-size:10px;color:var(--text2);margin-top:2px">${conf}%</div>
      </td>
      <td><button class="btn btn-primary btn-sm" onclick="openEmployeeSlide('${emp.emp_id}')">Inspect</button></td>
    </tr>`;
  }).join("");
  EMPLOYEES.forEach(emp => drawSparkline(document.getElementById(`pc-spark-${emp.emp_id}`), emp.trajectory));
}

// -- TOAST ----------------------------------------------------
function showToast(title, msg, type="red", empId=null) {
  const cont = document.getElementById("toast-container");
  const bc = type==="green"?"var(--green)":type==="amber"?"var(--amber)":"var(--red)";
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.borderLeftColor = bc;
  toast.innerHTML = `
    <div class="toast-title">${title}</div>
    <div class="toast-msg">${msg}</div>
    ${empId?`<button class="btn btn-primary btn-sm" onclick="openEmployeeSlide('${empId}')">Inspect ?</button>`:""}
    <div class="toast-progress" style="background:${bc}"></div>`;
  cont.prepend(toast);
  setTimeout(()=>{ toast.style.opacity="0"; toast.style.transform="translateX(100%)"; toast.style.transition="all 0.3s"; setTimeout(()=>toast.remove(),300); }, 6000);
}

// -- MODAL ----------------------------------------------------
function showModal(title, body, onConfirm) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = body;
  document.getElementById("modal-confirm-btn").onclick = () => { closeModal(); onConfirm(); };
  document.getElementById("confirm-modal").classList.add("show");
}
function closeModal() { document.getElementById("confirm-modal").classList.remove("show"); }
document.getElementById("confirm-modal").addEventListener("click", e => { if(e.target===e.currentTarget) closeModal(); });

// -- CBSI SIMULATOR -------------------------------------------
function recalcCBSI(emp, s) {
  let score = 35;
  if(s.loginHour < 7 || s.loginHour > 21) score += (14-Math.abs(s.loginHour-14))*2;
  if(s.records > emp.peer_avg_records*1.5) score += Math.min(25,(s.records/emp.peer_avg_records)*3);
  if(emp.emp_class==="CLERK" && s.amount > 499999) score += Math.min(22,s.amount/499999*8);
  if(s.dwellTime < 10) score += Math.min(20,(10-s.dwellTime)*2);
  return Math.min(95, Math.max(15, Math.round(score)));
}

// -- SLIDE — SCORE RING ---------------------------------------
function buildScoreRing(emp, container) {
  const sc = emp.cbsi;
  const color = scoreColor(sc);
  const pct = (sc/100)*360;
  const wrap = document.createElement("div");
  wrap.className = "score-ring-wrap";
  wrap.innerHTML = `
    <div class="score-ring" id="ring-${emp.emp_id}" style="background:conic-gradient(${color} 0deg, ${color} ${pct}deg, #E2E8F0 ${pct}deg)">
      <div class="score-ring-inner">
        <div class="score-num" style="color:${color}" id="score-count-${emp.emp_id}">0</div>
        <div class="score-label">CBSI</div>
      </div>
    </div>`;
  container.appendChild(wrap);
  // Animate count up
  let cur = 0; const step = Math.ceil(sc/40);
  const interval = setInterval(()=>{ cur=Math.min(cur+step,sc); document.getElementById(`score-count-${emp.emp_id}`).textContent=cur; if(cur>=sc) clearInterval(interval); },20);
  // Animate ring
  const el = document.getElementById(`ring-${emp.emp_id}`);
  el.style.background = `conic-gradient(${color} 0deg, #E2E8F0 0deg)`;
  setTimeout(()=>{ el.style.transition="background 0.8s ease"; el.style.background=`conic-gradient(${color} 0deg, ${color} ${pct}deg, #E2E8F0 ${pct}deg)`; },50);
}

// -- SLIDE — TRAJECTORY CHART ---------------------------------
const slideCharts = {};
function buildTrajectoryChart(emp, canvasId, maxY=100, fillColor="rgba(220,38,38,0.12)") {
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  if(slideCharts[canvasId]) slideCharts[canvasId].destroy();
  const days = Array.from({length:30},(_,i)=>`D${i+1}`);
  slideCharts[canvasId] = new Chart(ctx, {
    type:"line",
    data:{
      labels:days,
      datasets:[{
        data:emp.trajectory,
        borderColor:scoreColor(emp.cbsi),
        backgroundColor:fillColor,
        fill:true, tension:0.4,
        pointRadius:2, pointHoverRadius:5,
        borderWidth:2.5
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:600},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`Score: ${ctx.raw}`}}},
      scales:{
        y:{min:0,max:maxY,grid:{color:"#F1F5F9"},ticks:{font:{size:10}}},
        x:{grid:{display:false},ticks:{maxTicksLimit:6,font:{size:10}}}
      }
    }
  });
}

// -- SLIDE — PEER CHART ---------------------------------------
function buildPeerChart(emp, canvasId) {
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  if(slideCharts[canvasId]) slideCharts[canvasId].destroy();
  const empColor = scoreColor(emp.cbsi);
  slideCharts[canvasId] = new Chart(ctx, {
    type:"bar",
    data:{
      labels:["This Employee","Branch Avg","Role Avg","Bank Avg"],
      datasets:[{
        data:[emp.cbsi,28,22,19],
        backgroundColor:[empColor,"#CBD5E1","#CBD5E1","#CBD5E1"],
        borderRadius:6, borderWidth:0
      }]
    },
    options:{
      indexAxis:"y", responsive:true, maintainAspectRatio:false,
      animation:{duration:400},
      plugins:{legend:{display:false}},
      scales:{x:{min:0,max:100,grid:{color:"#F1F5F9"},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:11,weight:"600"}}}}
    }
  });
}

// -- SLIDE — SHAP BARS ----------------------------------------
function buildShapBars(emp, container, sliders) {
  const contributions = [
    {name:"Login Hour", val: (emp.login_hour<7||emp.login_hour>21)?Math.round((14-Math.abs(emp.login_hour-14))*2):2},
    {name:"Records", val: Math.round(Math.min(25,(emp.records_accessed/emp.peer_avg_records)*3))},
    {name:"Amount", val: emp.emp_class==="CLERK"&&emp.amount>499999?Math.round(Math.min(22,emp.amount/499999*8)):1},
    {name:"Dwell Time", val: Math.round(Math.min(20,(10-emp.dwell_time)*2))}
  ];
  const max = Math.max(...contributions.map(c=>c.val),1);
  container.innerHTML = contributions.map(c=>`
    <div class="shap-bar">
      <div class="shap-name">${c.name}</div>
      <div class="shap-fill" style="width:${Math.round((c.val/max)*120)}px;background:${c.val>10?"#DC2626":c.val>5?"#D97706":"#16A34A"}"></div>
      <div class="shap-val">+${c.val}</div>
    </div>`).join("");
}

// -- SLIDE — VIS.JS NETWORK -----------------------------------
const slideNetworks = {};
function buildSlideNetwork(emp, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  if(slideNetworks[containerId]) { slideNetworks[containerId].destroy(); }
  const nodes = new vis.DataSet([
    {id:emp.emp_id,label:emp.emp_id,color:{background:"#DC2626",border:"#B91C1C"},size:30,font:{color:"#fff",bold:true},shape:"dot"}
  ]);
  const edges = new vis.DataSet();
  const linkColors = {"MGR_2041":"#D97706","EMP_1193":"#D97706","ACC-MIRAGE-001":"#F59E0B","EXT_ACC_881":"#7C3AED","ACC_5021":"#7C3AED","ACC_5022":"#7C3AED","ACC_8821":"#7C3AED","EXT_IP_92":"#9333EA"};
  const linkShapes = {"ACC-MIRAGE-001":"star","EXT_ACC_881":"hexagon","ACC_5021":"hexagon","ACC_5022":"hexagon","ACC_8821":"hexagon","EXT_IP_92":"hexagon"};
  const linkLabels = {"ACC-MIRAGE-001":"HONEYPOT","EXT_ACC_881":"External","ACC_5021":"ExtAcc","ACC_5022":"ExtAcc","ACC_8821":"ExtAcc","EXT_IP_92":"ExtIP"};
  emp.network_links.forEach(link=>{
    const c = linkColors[link]||"#64748B";
    const s = linkShapes[link]||"dot";
    const l = linkLabels[link]||link;
    nodes.add({id:link,label:l,color:{background:c,border:c},size:link.includes("MIRAGE")?22:18,shape:s,font:{color:"#fff",bold:true}});
    edges.add({from:emp.emp_id,to:link,color:{color:c},width:2.5,dashes:link.includes("MIRAGE"),arrows:{to:{enabled:true,scaleFactor:0.8}}});
  });
  slideNetworks[containerId] = new vis.Network(container,{nodes,edges},{
    physics:{enabled:false}, interaction:{hover:true}, nodes:{shadow:true},
    edges:{smooth:{type:"continuous"}}, height:"100%"
  });
}

// -- SLIDE — ACTIVITY HEATMAP ---------------------------------
function buildHeatmap(emp, container) {
  const weeks = 12; const days = 7;
  let html = `<div style="display:grid;grid-template-columns:repeat(${weeks},1fr);gap:3px;margin-top:8px">`;
  for(let w=0;w<weeks;w++) {
    html += `<div style="display:grid;grid-template-rows:repeat(${days},1fr);gap:3px">`;
    for(let d=0;d<days;d++) {
      const isWeekend = d>=5; const isNight = Math.random()<0.1;
      const activity = isWeekend||isNight?0:Math.floor(Math.random()*120+20);
      const intensity = Math.min(1,activity/120);
      const alpha = (isWeekend||isNight)?0.1:0.2+intensity*0.7;
      const color = `rgba(22,163,74,${alpha.toFixed(2)})`;
      const date = `Week ${w+1}, Day ${d+1}`;
      html += `<div title="${date} — ${activity} records" style="aspect-ratio:1;border-radius:2px;background:${color};cursor:pointer;transition:transform 0.15s" onmouseenter="this.style.transform='scale(1.4)'" onmouseleave="this.style.transform='scale(1)'"></div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

// -- SLIDE — CLEARANCE SUMMARY --------------------------------
function buildClearanceSummary(emp, container) {
  const items = [
    {label:"Login pattern",val:`Within mandate (09:00–18:30)`},
    {label:"Record access",val:`Within role DFA (avg ${emp.records_accessed}/day)`},
    {label:"Transaction vol",val:`Within branch threshold`},
    {label:"Network links",val:"No suspicious connections"},
    {label:"Complaint history",val:"0 complaints in 90 days"},
    {label:"Peer comparison",val:"87th percentile — normal range"}
  ];
  container.innerHTML = items.map(i=>`
    <div class="clearance-row">
      <i class="fa-solid fa-circle-check clearance-check"></i>
      <span class="clearance-label">${i.label}</span>
      <span class="clearance-val">${i.val}</span>
    </div>`).join("") +
    `<button class="btn btn-green" style="width:100%;margin-top:16px" onclick="showToast('Generating','Clearance certificate for ${emp.emp_id} is being prepared...','green')">
      <i class="fa-solid fa-file-certificate"></i> Generate Clearance Certificate PDF
    </button>`;
}

// -- SLIDE — RADAR CHART --------------------------------------
function buildRadarChart(emp, canvasId) {
  const ctx = document.getElementById(canvasId);
  if(!ctx) return;
  if(slideCharts[canvasId]) slideCharts[canvasId].destroy();
  slideCharts[canvasId] = new Chart(ctx, {
    type:"radar",
    data:{
      labels:["Txn Volume","Working Hours","Record Access","Geo Consistency","After-Hours","Peer Deviation"],
      datasets:[
        {label:"This Employee",data:[emp.cbsi/10*1.2,8.5,emp.cbsi/10,9.2,1.1,emp.cbsi/10*0.8],backgroundColor:"rgba(59,130,246,0.15)",borderColor:"#3B82F6",pointBackgroundColor:"#3B82F6",borderWidth:2},
        {label:"Peer Median",data:[5.8,7.9,5.2,8.8,1.5,5.0],backgroundColor:"rgba(100,116,139,0.1)",borderColor:"#CBD5E1",borderWidth:1.5}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,animation:{duration:600},
      plugins:{legend:{position:"bottom",labels:{font:{size:10}}}},
      scales:{r:{min:0,max:10,ticks:{font:{size:9},stepSize:2},pointLabels:{font:{size:10}}}}
    }
  });
}

// -- RENDER FORENSIC SLIDE (CBSI >= 70) -----------------------
function renderForensicSlide(emp) {
  const hdr = document.getElementById("slide-header");
  hdr.innerHTML = `
    <button class="slide-back" onclick="closeEmployeeSlide()"><i class="fa-solid fa-arrow-left"></i> Back</button>
    <div style="width:4px;height:40px;background:var(--red);border-radius:2px"></div>
    <div class="slide-emp-info">
      <div class="slide-emp-id">${emp.emp_id} &nbsp;·&nbsp; ${emp.emp_class} &nbsp;·&nbsp; ${emp.branch_id}</div>
      <div class="slide-emp-sub"><span class="slide-status-pill pill-red">?? CRITICAL NON-COMPLIANCE — IMMEDIATE ESCALATION</span></div>
    </div>
    <div class="slide-actions">
      <button class="btn btn-green" onclick="confirmFraud('${emp.emp_id}')"><i class="fa-solid fa-check"></i> Confirm Fraud</button>
      <button class="btn btn-outline" onclick="showFalsePositiveForm('${emp.emp_id}')"><i class="fa-solid fa-xmark"></i> False Positive</button>
    </div>`;
  const body = document.getElementById("slide-body");
  body.innerHTML = `<div style="display:grid;grid-template-columns:35% 35% 30%;gap:16px;height:100%;overflow:hidden">
    <!-- COL 1 -->
    <div class="slide-col-wrap">
      <div class="card">
        <div class="card-title">CBSI Score</div>
        <div id="ring-wrap-${emp.emp_id}"></div>
        <div style="text-align:center;margin-top:8px"><span class="stat-badge badge-red">CRITICAL NON-COMPLIANCE</span></div>
      </div>
      <div class="card">
        <div class="card-title">Compliance Breach Simulator</div>
        <div class="card-sub" style="font-style:italic">Simulation only — record not modified</div>
        <div class="slider-row"><div class="slider-label"><span>Login Hour</span><span class="slider-val" id="s-lh">0${emp.login_hour}:00</span></div><input type="range" class="cbsi-slider" id="sl-lh" min="0" max="23" value="${emp.login_hour}" oninput="updateSimulator('${emp.emp_id}')"></div>
        <div class="slider-row"><div class="slider-label"><span>Records Accessed</span><span class="slider-val" id="s-ra">${emp.records_accessed}</span></div><input type="range" class="cbsi-slider" id="sl-ra" min="10" max="10000" value="${emp.records_accessed}" oninput="updateSimulator('${emp.emp_id}')"></div>
        <div class="slider-row"><div class="slider-label"><span>Amount (INR)</span><span class="slider-val" id="s-am">${fmtAmt(emp.amount)}</span></div><input type="range" class="cbsi-slider" id="sl-am" min="0" max="60000000" value="${emp.amount}" oninput="updateSimulator('${emp.emp_id}')"></div>
        <div class="slider-row"><div class="slider-label"><span>Dwell Time (sec)</span><span class="slider-val" id="s-dt">${emp.dwell_time}s</span></div><input type="range" class="cbsi-slider" id="sl-dt" min="0.5" max="600" step="0.5" value="${emp.dwell_time}" oninput="updateSimulator('${emp.emp_id}')"></div>
        <div class="live-score-display"><div class="live-score-num" id="live-score" style="color:${scoreColor(emp.cbsi)}">${emp.cbsi}</div><div class="live-score-label">Simulated CBSI Score</div></div>
        <div style="margin-top:12px"><div style="font-size:12px;font-weight:600;color:var(--text1);margin-bottom:8px">Signal Contributions (SHAP)</div><div id="shap-container"></div></div>
      </div>
    </div>
    <!-- COL 2 -->
    <div class="slide-col-wrap">
      <div class="card" style="flex:0 0 auto">
        <div class="card-title">Behavioural Trajectory — 30 Days</div>
        <div style="height:200px;position:relative"><canvas id="traj-${emp.emp_id}"></canvas></div>
      </div>
      <div class="card" style="flex:0 0 auto">
        <div class="card-title">Cohort Benchmark</div>
        <div style="height:160px"><canvas id="peer-${emp.emp_id}"></canvas></div>
      </div>
    </div>
    <!-- COL 3 -->
    <div class="slide-col-wrap">
      <div class="card" style="flex:0 0 180px">
        <div class="card-title">Transaction Network</div>
        <div style="font-size:11px;color:var(--red);font-weight:600;margin-bottom:8px">Suspicious links detected</div>
        <div class="network-container" id="net-${emp.emp_id}"></div>
      </div>
      <div class="card">
        <div class="card-title">Evidence & STR</div>
        <button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick="showToast('PDF Queued','Forensic evidence package being compiled...','green')"><i class="fa-solid fa-file-pdf"></i> Download Evidence PDF</button>
        <button class="btn btn-outline" style="width:100%;margin-bottom:16px;color:var(--red);border-color:var(--red)" onclick="fileSTR('${emp.emp_id}')"><i class="fa-solid fa-file-export"></i> File STR to FIU-IND</button>
        ${emp.alert_id?`
          <div class="hash-row"><span class="shap-name">SHA-256</span><span class="hash-val">a3f8c2e1d4b7...</span><button class="copy-btn" onclick="navigator.clipboard.writeText('a3f8c2e1d4b7')">Copy</button></div>
          <div class="hash-row"><span class="shap-name">Block ID</span><span class="hash-val">#47 · 2026-03-15 02:47:33</span></div>
          <div class="chain-verified"><i class="fa-solid fa-circle-check"></i> BLOCKCHAIN VERIFIED</div>
        `:``}
        <div class="slide-sep"></div>
        <div class="card-title" style="font-size:12px">Top Signals</div>
        ${emp.signals.map(s=>`<div style="font-size:12px;color:var(--text2);padding:4px 0;border-bottom:1px solid #F1F5F9"><i class="fa-solid fa-triangle-exclamation" style="color:var(--red)"></i> ${s}</div>`).join("")}
        <div id="fp-form" style="display:none;margin-top:12px">
          <div style="font-size:12px;font-weight:600;margin-bottom:6px">Mandatory justification:</div>
          <textarea class="notes-area" id="fp-text" rows="3" placeholder="Enter justification..."></textarea>
          <button class="btn btn-outline" style="margin-top:8px;width:100%" onclick="submitFalsePositive('${emp.emp_id}')">Submit Dismissal</button>
        </div>
      </div>
    </div>
  </div>`;
  setTimeout(()=>{
    buildScoreRing(emp, document.getElementById(`ring-wrap-${emp.emp_id}`));
    buildTrajectoryChart(emp, `traj-${emp.emp_id}`, 100, "rgba(220,38,38,0.12)");
    buildPeerChart(emp, `peer-${emp.emp_id}`);
    buildShapBars(emp, document.getElementById("shap-container"), null);
    if(emp.network_links.length>0) buildSlideNetwork(emp, `net-${emp.emp_id}`);
    else document.getElementById(`net-${emp.emp_id}`).innerHTML=`<div class="info-card-blue">No direct transaction network data.</div>`;
  },100);
}

function updateSimulator(empId) {
  const emp = EMPLOYEES.find(e=>e.emp_id===empId);
  if(!emp) return;
  const lh=parseInt(document.getElementById("sl-lh").value);
  const ra=parseInt(document.getElementById("sl-ra").value);
  const am=parseInt(document.getElementById("sl-am").value);
  const dt=parseFloat(document.getElementById("sl-dt").value);
  document.getElementById("s-lh").textContent=(lh<10?"0"+lh:lh)+":00";
  document.getElementById("s-ra").textContent=ra.toLocaleString();
  document.getElementById("s-am").textContent=fmtAmt(am);
  document.getElementById("s-dt").textContent=dt+"s";
  const simEmp = {...emp,login_hour:lh,records_accessed:ra,amount:am,dwell_time:dt};
  const newScore = recalcCBSI(emp,{loginHour:lh,records:ra,amount:am,dwellTime:dt});
  const scoreEl = document.getElementById("live-score");
  if(scoreEl) { scoreEl.textContent=newScore; scoreEl.style.color=scoreColor(newScore); }
  buildShapBars(simEmp, document.getElementById("shap-container"), null);
  // Update peer chart
  const peerCtx = slideCharts[`peer-${empId}`];
  if(peerCtx) { peerCtx.data.datasets[0].data[0]=newScore; peerCtx.data.datasets[0].backgroundColor[0]=scoreColor(newScore); peerCtx.update("none"); }
}

function confirmFraud(empId) {
  showModal("Confirm Fraud — This Cannot Be Undone",
    `<strong>Confirming fraud for ${empId} will:</strong><br><br>
    • Escalate to Tier-2 Zonal FCU immediately<br>
    • Auto-file STR to FIU-IND<br>
    • Lock employee system access pending inquiry<br>
    • Create permanent forensic record<br><br>
    <em style="color:var(--red)">This action cannot be undone.</em>`,
    ()=>showToast("Fraud Confirmed",`${empId} escalated to Tier-2 FCU. STR filed. Access revoked.`,"red"));
}

function fileSTR(empId) {
  showModal("File STR to FIU-IND",`<strong>Suspicious Transaction Report</strong><br><br>This will file an official STR for ${empId} with the Financial Intelligence Unit (FIU-IND).<br><br>Reference will be generated automatically.`,
    ()=>showToast("STR Filed",`STR submitted to FIU-IND for ${empId}. Reference: STR-2026-0${Math.floor(Math.random()*900+100)}`,"amber"));
}

function showFalsePositiveForm(empId) {
  const fp = document.getElementById("fp-form");
  if(fp) fp.style.display = fp.style.display==="none"?"block":"none";
}

function submitFalsePositive(empId) {
  const txt = document.getElementById("fp-text")?.value||"";
  if(!txt.trim()) { alert("Justification required before dismissal."); return; }
  showToast("Dismissal Submitted",`False positive recorded for ${empId}. Pending supervisor review.`,"amber");
  closeEmployeeSlide();
}

// -- RENDER WATCH SLIDE (CBSI 40-69) --------------------------
function renderWatchSlide(emp) {
  const hdr = document.getElementById("slide-header");
  hdr.innerHTML = `
    <button class="slide-back" onclick="closeEmployeeSlide()"><i class="fa-solid fa-arrow-left"></i> Back</button>
    <div style="width:4px;height:40px;background:var(--amber);border-radius:2px"></div>
    <div class="slide-emp-info">
      <div class="slide-emp-id">${emp.emp_id} &nbsp;·&nbsp; ${emp.emp_class} &nbsp;·&nbsp; ${emp.branch_id}</div>
      <div class="slide-emp-sub"><span class="slide-status-pill pill-amber">?? ELEVATED RISK — ENHANCED MONITORING</span></div>
    </div>
    <div class="slide-actions">
      <button class="btn btn-primary" onclick="showToast('Watchlist Updated','${emp.emp_id} added to enhanced monitoring','amber')"><i class="fa-solid fa-plus"></i> Add to Watchlist</button>
      <button class="btn btn-outline" onclick="showToast('History','Loading access history for ${emp.emp_id}...','amber')"><i class="fa-solid fa-clock-rotate-left"></i> View History</button>
    </div>`;
  const body = document.getElementById("slide-body");
  body.innerHTML = `<div style="display:grid;grid-template-columns:55% 45%;gap:16px;height:100%;overflow:hidden">
    <!-- LEFT -->
    <div class="slide-col-wrap">
      <div class="card">
        <div class="card-title">CBSI Score</div>
        <div id="ring-wrap-${emp.emp_id}"></div>
        <div style="text-align:center;margin-top:8px"><span class="stat-badge badge-amber">ELEVATED RISK — MONITORING</span></div>
      </div>
      <div class="card">
        <div class="card-title">Compliance Breach Simulator</div>
        <div class="card-sub" style="font-style:italic">Simulation only</div>
        <div class="slider-row"><div class="slider-label"><span>Login Hour</span><span class="slider-val" id="s-lh">${emp.login_hour}:00</span></div><input type="range" class="cbsi-slider" id="sl-lh" min="0" max="23" value="${emp.login_hour}" oninput="updateSimulatorWatch('${emp.emp_id}')"></div>
        <div class="slider-row"><div class="slider-label"><span>Records Accessed</span><span class="slider-val" id="s-ra">${emp.records_accessed}</span></div><input type="range" class="cbsi-slider" id="sl-ra" min="10" max="10000" value="${emp.records_accessed}" oninput="updateSimulatorWatch('${emp.emp_id}')"></div>
        <div class="slider-row"><div class="slider-label"><span>Amount (INR)</span><span class="slider-val" id="s-am">${fmtAmt(emp.amount)}</span></div><input type="range" class="cbsi-slider" id="sl-am" min="0" max="60000000" value="${emp.amount}" oninput="updateSimulatorWatch('${emp.emp_id}')"></div>
        <div class="slider-row"><div class="slider-label"><span>Dwell Time (sec)</span><span class="slider-val" id="s-dt">${emp.dwell_time}s</span></div><input type="range" class="cbsi-slider" id="sl-dt" min="0.5" max="600" step="0.5" value="${emp.dwell_time}" oninput="updateSimulatorWatch('${emp.emp_id}')"></div>
        <div class="live-score-display"><div class="live-score-num" id="live-score" style="color:${scoreColor(emp.cbsi)}">${emp.cbsi}</div><div class="live-score-label">Simulated CBSI Score</div></div>
        <div style="margin-top:12px"><div style="font-size:12px;font-weight:600;margin-bottom:8px">Signal Contributions</div><div id="shap-container"></div></div>
      </div>
      <div class="card">
        <div class="card-title">Behavioural Trajectory — 30 Days</div>
        <div style="height:180px"><canvas id="traj-${emp.emp_id}"></canvas></div>
      </div>
    </div>
    <!-- RIGHT -->
    <div class="slide-col-wrap">
      <div class="card">
        <div class="card-title">Cohort Benchmark</div>
        <div style="height:150px"><canvas id="peer-${emp.emp_id}"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Watch Actions</div>
        <div class="watch-action-row"><span>Enhanced Monitoring</span><label class="toggle-sw"><input type="checkbox" checked onchange="showToast('Monitoring','Status updated','amber')"><span class="toggle-slider"></span></label></div>
        <div class="watch-action-row"><span>Daily Score Review</span><label class="toggle-sw"><input type="checkbox" onchange="showToast('Daily Review','Status updated','amber')"><span class="toggle-slider"></span></label></div>
        <div class="watch-action-row"><span>Supervisor Notified</span><label class="toggle-sw"><input type="checkbox" onchange="showToast('Supervisor','Notification sent','amber')"><span class="toggle-slider"></span></label></div>
        <textarea class="notes-area" rows="3" placeholder="Add investigation note..."></textarea>
        <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="showToast('Note Saved','Investigation note recorded for ${emp.emp_id}','green')">Save Note</button>
        <div style="margin-top:12px">
          <div style="font-size:12px;font-weight:600;margin-bottom:6px">Recent Notes</div>
          <div class="note-item"><span class="note-date">2026-03-14:</span> Unusual access pattern noted — J.Sharma</div>
          <div class="note-item"><span class="note-date">2026-03-12:</span> Records reviewed, no direct fraud evidence yet</div>
        </div>
      </div>
      <div class="info-card-green">
        <i class="fa-solid fa-circle-check"></i> <strong>No suspicious network detected.</strong><br>
        Standard peer-to-peer transaction flows only. Continue enhanced monitoring.
      </div>
    </div>
  </div>`;
  setTimeout(()=>{
    buildScoreRing(emp, document.getElementById(`ring-wrap-${emp.emp_id}`));
    buildTrajectoryChart(emp, `traj-${emp.emp_id}`, 80, "rgba(217,119,6,0.12)");
    buildPeerChart(emp, `peer-${emp.emp_id}`);
    buildShapBars(emp, document.getElementById("shap-container"), null);
  },100);
}

function updateSimulatorWatch(empId) {
  const emp = EMPLOYEES.find(e=>e.emp_id===empId);
  if(!emp) return;
  const lh=parseInt(document.getElementById("sl-lh").value);
  const ra=parseInt(document.getElementById("sl-ra").value);
  const am=parseInt(document.getElementById("sl-am").value);
  const dt=parseFloat(document.getElementById("sl-dt").value);
  document.getElementById("s-lh").textContent=(lh<10?"0"+lh:lh)+":00";
  document.getElementById("s-ra").textContent=ra.toLocaleString();
  document.getElementById("s-am").textContent=fmtAmt(am);
  document.getElementById("s-dt").textContent=dt+"s";
  const newScore = recalcCBSI(emp,{loginHour:lh,records:ra,amount:am,dwellTime:dt});
  const scoreEl = document.getElementById("live-score");
  if(scoreEl){scoreEl.textContent=newScore; scoreEl.style.color=scoreColor(newScore);}
  buildShapBars({...emp,login_hour:lh,records_accessed:ra,amount:am,dwell_time:dt}, document.getElementById("shap-container"), null);
}

// -- RENDER BASELINE SLIDE (CBSI < 40) ------------------------
function renderBaselineSlide(emp) {
  const hdr = document.getElementById("slide-header");
  hdr.innerHTML = `
    <button class="slide-back" onclick="closeEmployeeSlide()"><i class="fa-solid fa-arrow-left"></i> Back</button>
    <div style="width:4px;height:40px;background:var(--green);border-radius:2px"></div>
    <div class="slide-emp-info">
      <div class="slide-emp-id">${emp.emp_id} &nbsp;·&nbsp; ${emp.emp_class} &nbsp;·&nbsp; ${emp.branch_id}</div>
      <div class="slide-emp-sub"><span class="slide-status-pill pill-green">? COMPLIANT — WITHIN NORMAL PARAMETERS</span></div>
    </div>
    <div class="slide-actions">
      <button class="btn btn-green" onclick="showToast('Clearance Report','Generating clearance report for ${emp.emp_id}...','green')"><i class="fa-solid fa-file-shield"></i> Generate Clearance Report</button>
    </div>`;
  const body = document.getElementById("slide-body");
  body.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;height:100%;overflow:hidden">
    <!-- LEFT -->
    <div class="slide-col-wrap">
      <div class="card">
        <div class="card-title">CBSI Score</div>
        <div id="ring-wrap-${emp.emp_id}"></div>
        <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--text2)">Operating within all regulatory parameters</div>
      </div>
      <div class="card">
        <div class="card-title">Peer Cohort Comparison</div>
        <div style="height:200px"><canvas id="radar-${emp.emp_id}"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Activity Heatmap — 12 Weeks</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px">Green = daytime activity · Faded = nights/weekends</div>
        <div id="heatmap-${emp.emp_id}"></div>
      </div>
    </div>
    <!-- RIGHT -->
    <div class="slide-col-wrap">
      <div class="card">
        <div class="card-title">Stable Behavioural Profile — No Anomalies</div>
        <div style="height:180px"><canvas id="traj-${emp.emp_id}"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Clearance Summary</div>
        <div id="clearance-wrap-${emp.emp_id}"></div>
      </div>
      <div class="info-card-blue">
        <i class="fa-solid fa-shield-check"></i> <strong>VaultMind has continuously monitored ${emp.emp_id} for 142 days with no anomalies detected.</strong><br>
        No investigation action recommended.
      </div>
    </div>
  </div>`;
  setTimeout(()=>{
    buildScoreRing(emp, document.getElementById(`ring-wrap-${emp.emp_id}`));
    buildTrajectoryChart(emp, `traj-${emp.emp_id}`, 50, "rgba(22,163,74,0.08)");
    buildRadarChart(emp, `radar-${emp.emp_id}`);
    buildHeatmap(emp, document.getElementById(`heatmap-${emp.emp_id}`));
    buildClearanceSummary(emp, document.getElementById(`clearance-wrap-${emp.emp_id}`));
  },100);
}

// -- OPEN / CLOSE SLIDE ---------------------------------------
function openEmployeeSlide(empId) {
  const emp = EMPLOYEES.find(e=>e.emp_id===empId);
  if(!emp) return;
  // Destroy old slide charts/networks
  Object.keys(slideCharts).forEach(k=>{ try{slideCharts[k].destroy();}catch(e){} delete slideCharts[k]; });
  Object.keys(slideNetworks).forEach(k=>{ try{slideNetworks[k].destroy();}catch(e){} delete slideNetworks[k]; });
  const slide = document.getElementById("employee-slide");
  slide.style.display = "flex";
  slide.style.transform = "translateX(100%)";
  slide.style.transition = "none";
  if(emp.cbsi >= 70) renderForensicSlide(emp);
  else if(emp.cbsi >= 40) renderWatchSlide(emp);
  else renderBaselineSlide(emp);
  requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
    slide.style.transition = "transform 350ms cubic-bezier(0.16,1,0.3,1)";
    slide.style.transform = "translateX(0)";
  }); });
}

function closeEmployeeSlide() {
  const slide = document.getElementById("employee-slide");
  slide.style.transition = "transform 350ms cubic-bezier(0.16,1,0.3,1)";
  slide.style.transform = "translateX(100%)";
  setTimeout(()=>{ slide.style.display="none"; }, 350);
}

// -- LIVE SIMULATION -------------------------------------------
const simNames = ["EMP_4001","EMP_4012","EMP_4023","EMP_4034","EMP_4045","EMP_4056"];
const simSignals = ["Unusual record access","Late login detected","Rapid transactions","Multiple failed auth","Peer deviation +2s","Off-hours file access"];
let simIdx = 0;

function generateNormalTx() { /* silent — no UI change needed */ }

function generateMediumAlert() {
  const feed = document.getElementById("alert-feed");
  if(!feed) return;
  const empId = simNames[simIdx%simNames.length]; simIdx++;
  const score = Math.floor(Math.random()*25+40);
  const sig = simSignals[Math.floor(Math.random()*simSignals.length)];
  const card = document.createElement("div");
  card.className = "alert-card high";
  card.innerHTML = `
    <div class="score-badge high">${score}</div>
    <div class="alert-card-inner">
      <div class="alert-emp">${empId} · CLERK · BR_${Math.floor(Math.random()*15+1).toString().padStart(2,"0")}</div>
      <div class="alert-signal">${sig}</div>
      <div class="alert-time">just now</div>
      <div class="alert-actions"><span class="stat-badge badge-amber">WATCH</span></div>
    </div>`;
  card.style.opacity="0"; card.style.transform="translateY(-10px)";
  feed.insertBefore(card, feed.firstChild);
  setTimeout(()=>{ card.style.transition="all 0.4s"; card.style.opacity="1"; card.style.transform="translateY(0)"; },10);
}

function generateHighRiskAlert() {
  const emp = FRAUD_EMPS[Math.floor(Math.random()*FRAUD_EMPS.length)];
  showToast(`? High Risk Alert`, `${emp.emp_id} — ${emp.signals[0]||"Anomaly detected"}<br><small>Score: ${emp.cbsi}</small>`, "red", emp.emp_id);
}

setInterval(generateNormalTx, 5000);
setInterval(generateMediumAlert, 20000);
setInterval(generateHighRiskAlert, 45000);

// -- INIT -----------------------------------------------------
function init() {
  buildTicker();
  renderAlertFeed();
  renderThreatGauge();
  filterEmployees();
  renderDeceptionGuard();
  renderEvidence();
  renderPreCrime();
  // FundFlow renders on nav click to page
  document.querySelector("[data-page=page-fundflow]").addEventListener("click",()=>setTimeout(renderFundflowNetwork,100));
  showPage("page-command");
  // Periodic alert feed refresh
  setInterval(()=>{ const feed=document.getElementById("alert-feed"); if(feed&&document.getElementById("page-command").classList.contains("active")) renderAlertFeed(); },30000);
}

init();
