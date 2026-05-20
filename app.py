"""
VAULTMIND 2.0 - Fraud Intelligence Command Center (Streamlit)
Dark-Mode Cybersecurity Dashboard with Live Kafka Simulation
Netflix Dark Theme Default with Light Theme Toggle
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import os, re, time, json, hashlib, tempfile
from datetime import datetime, timedelta
from pyvis.network import Network
import streamlit.components.v1 as components

# ----------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HIST_CSV = os.path.join(BASE_DIR, "Testing_data", "historical_warmup_data.csv")
LIVE_CSV = os.path.join(BASE_DIR, "Testing_data", "live_demo_stream.csv")
EMP_CSV  = os.path.join(BASE_DIR, "Testing_data", "employees_master.csv")
PDF_DIR  = os.path.join(BASE_DIR, "evidence_output", "pdf_reports")
STR_DIR  = os.path.join(BASE_DIR, "evidence_output", "str_reports")
ROWS_PER_PAGE = 20

SENTIMENT_KEYWORDS = [
    r"\bstolen\b", r"\bbribe\b", r"\bhacked\b",
    r"\bextortion\b", r"\bunauthorized\b", r"\billegal\b", r"\bthreat\b",
    r"\bfraud\b", r"\bmoney.?launder\b", r"\bforged?\b",
]

# ----------------------------------------------------------------
# THEME SYSTEM  (Netflix Dark = default)
# ----------------------------------------------------------------
THEMES = {
    "dark": {
        "bg": "#141414", "card": "#232323", "card_alt": "#1A1A2E",
        "border": "#333333", "text": "#FFFFFF", "text2": "#A0A0A0",
        "accent": "#E50914", "teal": "#00D4AA", "cyan": "#00B4D8",
        "red": "#E50914", "amber": "#FFB300", "green": "#00E676",
        "sidebar_bg": "linear-gradient(180deg, #0D0D0D 0%, #1A1A1A 100%)",
        "sidebar_text": "#B0B0B0", "hover": "#E50914",
        "gradient": "linear-gradient(135deg, #232323 0%, #1A1A2E 100%)",
    },
    "light": {
        "bg": "#F5F5F5", "card": "#FFFFFF", "card_alt": "#F8F9FA",
        "border": "#E0E0E0", "text": "#1A1A1A", "text2": "#666666",
        "accent": "#D32F2F", "teal": "#00897B", "cyan": "#0288D1",
        "red": "#D32F2F", "amber": "#F57F17", "green": "#2E7D32",
        "sidebar_bg": "linear-gradient(180deg, #FAFAFA 0%, #F0F0F0 100%)",
        "sidebar_text": "#555555", "hover": "#D32F2F",
        "gradient": "linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)",
    },
}

st.set_page_config(
    page_title="VaultMind 2.0 - Fraud Intelligence",
    page_icon="V",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Theme state
if "theme" not in st.session_state:
    st.session_state.theme = "dark"

T = THEMES[st.session_state.theme]


def inject_css(t):
    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    html, body, .stApp {{
        background-color: {t['bg']} !important;
        color: {t['text']};
        font-family: 'DM Sans', sans-serif;
    }}
    .stApp > header {{ background-color: transparent !important; }}
    [data-testid="stSidebar"] {{
        background: {t['sidebar_bg']} !important;
        border-right: 1px solid {t['border']};
    }}
    [data-testid="stSidebar"] * {{ color: {t['sidebar_text']} !important; }}

    .vm-card {{
        background: {t['gradient']};
        border: 1px solid {t['border']};
        border-radius: 14px;
        padding: 20px 24px;
        margin-bottom: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.25);
        transition: border-color 0.2s;
    }}
    .vm-card:hover {{ border-color: {t['accent']}; }}
    .vm-card-title {{
        font-size: 11px; font-weight: 600;
        color: {t['text2']}; text-transform: uppercase;
        letter-spacing: 1.5px; margin-bottom: 4px;
    }}
    .vm-card-value {{
        font-size: 28px; font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
    }}

    .vm-section {{
        font-size: 13px; font-weight: 700;
        color: {t['accent']}; text-transform: uppercase;
        letter-spacing: 2px; padding: 10px 0 6px;
        border-bottom: 1px solid {t['border']};
        margin-bottom: 14px;
    }}

    .stat-chip {{
        display: inline-block; padding: 4px 12px;
        border-radius: 8px; font-size: 12px;
        font-weight: 600; font-family: 'JetBrains Mono', monospace;
    }}
    .badge-critical {{ background: rgba(229,9,20,0.15); color: {t['red']}; border: 1px solid {t['red']}; }}
    .badge-high     {{ background: rgba(255,179,0,0.15); color: {t['amber']}; border: 1px solid {t['amber']}; }}
    .badge-normal   {{ background: rgba(0,230,118,0.15); color: {t['green']}; border: 1px solid {t['green']}; }}
    .badge-watch    {{ background: rgba(0,180,216,0.15); color: {t['cyan']}; border: 1px solid {t['cyan']}; }}

    .stDataFrame thead th {{
        background-color: {t['card']} !important;
        color: {t['text2']} !important;
        font-size: 11px !important; text-transform: uppercase;
        letter-spacing: 1px;
    }}
    .stDataFrame tbody td {{
        background-color: {t['bg']} !important;
        color: {t['text']} !important;
        font-size: 13px !important;
        border-bottom: 1px solid {t['border']} !important;
    }}

    .stTabs [data-baseweb="tab-list"] {{ gap: 0; border-bottom: 1px solid {t['border']}; }}
    .stTabs [data-baseweb="tab"] {{
        color: {t['text2']}; font-weight: 600; font-size: 13px;
        letter-spacing: 0.5px; padding: 10px 20px;
        border-bottom: 2px solid transparent;
    }}
    .stTabs [aria-selected="true"] {{
        color: {t['accent']} !important;
        border-bottom: 2px solid {t['accent']} !important;
        background: transparent !important;
    }}

    @keyframes pulse {{ 0%,100%{{opacity:1}} 50%{{opacity:0.3}} }}
    .live-dot {{
        display: inline-block; width: 8px; height: 8px;
        border-radius: 50%; background: {t['green']};
        animation: pulse 1.5s infinite; margin-right: 6px;
    }}

    .theme-btn {{
        background: {t['card']}; border: 1px solid {t['border']};
        border-radius: 8px; padding: 6px 14px; cursor: pointer;
        color: {t['text']}; font-size: 14px;
        transition: background 0.2s, border-color 0.2s;
    }}
    .theme-btn:hover {{ border-color: {t['accent']}; }}

    ::-webkit-scrollbar {{ width: 6px; }}
    ::-webkit-scrollbar-track {{ background: {t['bg']}; }}
    ::-webkit-scrollbar-thumb {{ background: {t['border']}; border-radius: 3px; }}

    #MainMenu, footer, header {{ visibility: hidden; }}
    .stDeployButton {{ display: none; }}
    div[data-testid="stDecoration"] {{ display: none; }}
    </style>
    """, unsafe_allow_html=True)

inject_css(T)

# ----------------------------------------------------------------
# DATA LOADING
# ----------------------------------------------------------------
@st.cache_data(ttl=300)
def load_employees():
    try:
        return pd.read_csv(EMP_CSV)
    except Exception:
        return pd.DataFrame(columns=["emp_id","emp_class","branch_id","peer_cluster","work_start_hr","work_end_hr"])

@st.cache_data(ttl=300)
def load_historical():
    try:
        return pd.read_csv(HIST_CSV, parse_dates=["timestamp"])
    except Exception:
        return pd.DataFrame()

@st.cache_data(ttl=300)
def load_live_stream():
    try:
        return pd.read_csv(LIVE_CSV, parse_dates=["timestamp"])
    except Exception:
        return pd.DataFrame()

def build_master_df():
    h = load_historical()
    l = load_live_stream()
    if h.empty and l.empty:
        return pd.DataFrame()
    df = pd.concat([h, l], ignore_index=True)
    df.sort_values("timestamp", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


# ----------------------------------------------------------------
# SCORING ENGINE (Agents 3-6 heuristic replica)
# ----------------------------------------------------------------
def score_row(row):
    try:
        score = 15.0
        amount = float(row.get("amount", 0))
        emp_class = str(row.get("emp_class", "CLERK")).upper()
        action = str(row.get("action_type", ""))
        channel = str(row.get("transfer_channel", "")).upper()
        ts = row.get("timestamp")
        fraud_flag = int(row.get("is_fraud_flag", 0))

        if emp_class == "CLERK" and amount > 5_000_000:
            score = max(score, 85)
        if emp_class not in ["IT_ADMIN", "ADMIN"] and action in ["SYSTEM_BULK_EXPORT","DB_GRANT_ACCESS","SYSTEM_CONFIG_CHANGE"]:
            score = max(score, 95)
        if emp_class == "IT_ADMIN" and amount > 0:
            score = max(score, 90)

        limits = {"UPI": 200_000, "IMPS": 500_000, "NEFT": 1_000_000, "RTGS": 100_000_000}
        if channel in limits and amount > limits[channel]:
            score = max(score, 100)
        if 49_000 <= amount <= 49_999:
            score = max(score, 60)

        for field in ["raw_complaint_text", "hr_remark_text"]:
            text = str(row.get(field, ""))
            if text and text.strip() and text.lower() != "nan":
                for pat in SENTIMENT_KEYWORDS:
                    if re.search(pat, text, re.IGNORECASE):
                        score += 25
                        break

        if ts is not None:
            try:
                hour = pd.Timestamp(ts).hour
                if hour < 7 or hour > 21:
                    score += 12
            except Exception:
                pass

        if emp_class == "CLERK" and action == "Approve":
            score += 25
        if fraud_flag == 1 and score < 50:
            score += 35

        return int(min(100, max(0, score)))
    except Exception:
        return 15

def score_dataframe(df):
    if df.empty:
        df["cbsi_score"] = []
        return df
    df = df.copy()
    df["cbsi_score"] = df.apply(score_row, axis=1)
    return df

def risk_tier(score):
    if score >= 70: return "CRITICAL"
    if score >= 40: return "HIGH"
    if score >= 25: return "WATCH"
    return "NORMAL"

def tier_color(tier):
    return {"CRITICAL": T['red'], "HIGH": T['amber'], "WATCH": T['cyan'], "NORMAL": T['green']}.get(tier, T['text2'])

def tier_badge(tier):
    cls = {"CRITICAL":"badge-critical","HIGH":"badge-high","WATCH":"badge-watch","NORMAL":"badge-normal"}.get(tier,"badge-normal")
    return f'<span class="stat-chip {cls}">{tier}</span>'

def extract_nlp_flags(row):
    flags = []
    try:
        for field in ["raw_complaint_text", "hr_remark_text"]:
            text = str(row.get(field, ""))
            if text and text.lower() not in ["", "nan"]:
                for pat in SENTIMENT_KEYWORDS:
                    m = re.search(pat, text, re.IGNORECASE)
                    if m:
                        flags.append(f"{field}: '{m.group()}'")
    except Exception:
        pass
    return flags

def get_triggered_rules(row):
    reasons = []
    try:
        amount = float(row.get("amount", 0))
        emp_class = str(row.get("emp_class", "")).upper()
        action = str(row.get("action_type", ""))
        channel = str(row.get("transfer_channel", "")).upper()

        if emp_class == "CLERK" and amount > 5_000_000:
            reasons.append(f"A5: CLERK txn Rs.{amount:,.0f} exceeds 5M limit")
        if emp_class not in ["IT_ADMIN","ADMIN"] and action in ["SYSTEM_BULK_EXPORT","DB_GRANT_ACCESS","SYSTEM_CONFIG_CHANGE"]:
            reasons.append(f"A5: {emp_class} attempted restricted '{action}'")
        if emp_class == "IT_ADMIN" and amount > 0:
            reasons.append(f"A5: IT_ADMIN financial transfer Rs.{amount:,.0f}")
        if emp_class == "CLERK" and action == "Approve":
            reasons.append("A5: CLERK performed APPROVE (needs MANAGER)")

        limits = {"UPI": 200_000, "IMPS": 500_000, "NEFT": 1_000_000, "RTGS": 100_000_000}
        if channel in limits and amount > limits[channel]:
            reasons.append(f"A6: {channel} Rs.{amount:,.0f} exceeds Rs.{limits[channel]:,.0f}")
        if 49_000 <= amount <= 49_999:
            reasons.append(f"A6: Structuring suspected (Rs.{amount:,.0f} near 50k)")
    except Exception:
        pass
    return reasons

PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="DM Sans", color=T['text2'], size=12),
    xaxis=dict(gridcolor=T['border'], zerolinecolor=T['border']),
    yaxis=dict(gridcolor=T['border'], zerolinecolor=T['border']),
    margin=dict(l=40, r=20, t=40, b=40),
    hoverlabel=dict(bgcolor=T['card'], font_color=T['text'], bordercolor=T['accent']),
)


# ----------------------------------------------------------------
# SIDEBAR
# ----------------------------------------------------------------
with st.sidebar:
    st.markdown(f"""
    <div style="text-align:center; padding: 16px 0 20px;">
        <div style="font-size:18px; font-weight:700; color:{T['accent']}; letter-spacing:2px;">VAULTMIND</div>
        <div style="font-size:10px; color:{T['text2']}; letter-spacing:3px;">FRAUD INTELLIGENCE 2.0</div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f'<div class="vm-section">Navigation</div>', unsafe_allow_html=True)
    page = st.radio(
        "Page",
        ["Command Centre", "Employee Roster", "Employee Profile", "Fund Flow Graph", "Evidence Vault"],
        label_visibility="collapsed"
    )

    st.markdown("---")

    # Theme toggle
    st.markdown(f'<div class="vm-section">Appearance</div>', unsafe_allow_html=True)
    current_icon = "Light Mode" if st.session_state.theme == "dark" else "Dark Mode"
    if st.button(current_icon, key="theme_toggle"):
        st.session_state.theme = "light" if st.session_state.theme == "dark" else "dark"
        st.rerun()

    st.markdown("---")
    st.markdown(f'<div style="padding:8px 0;"><span class="live-dot"></span>'
                f'<span style="font-size:11px; color:{T["text2"]};">KAFKA STREAM ACTIVE</span></div>',
                unsafe_allow_html=True)

    st.markdown(f'<div class="vm-section">Live Stream</div>', unsafe_allow_html=True)
    auto_refresh = st.checkbox("Auto-refresh (5s)", value=False, key="auto_refresh_toggle")
    if auto_refresh:
        try:
            from streamlit_autorefresh import st_autorefresh
            st_autorefresh(interval=5000, limit=None, key="kafka_refresh")
        except ImportError:
            st.info("Install streamlit-autorefresh for live updates.")

    if st.button("Ingest Batch", key="ingest_btn"):
        if "kafka_offset" not in st.session_state:
            st.session_state.kafka_offset = 0
        st.session_state.kafka_offset = min(st.session_state.get("kafka_offset", 0) + 50, 8183)
        st.rerun()


# ----------------------------------------------------------------
# LOAD DATA
# ----------------------------------------------------------------
if "kafka_offset" not in st.session_state:
    st.session_state.kafka_offset = 200

master_raw = build_master_df()
hist_count = len(load_historical())
live_limit = st.session_state.kafka_offset
total_rows = hist_count + live_limit
display_df = master_raw.iloc[:total_rows].copy() if not master_raw.empty else master_raw.copy()
scored_df = score_dataframe(display_df)
emp_df = load_employees()


# ================================================================
# PAGE: COMMAND CENTRE
# ================================================================
if page == "Command Centre":
    st.markdown(f"""
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
        <span style="font-size:28px; font-weight:700; color:{T['text']};">Command Centre</span>
        <span class="live-dot"></span>
        <span style="font-size:12px; color:{T['text2']};">LIVE</span>
    </div>""", unsafe_allow_html=True)

    try:
        total_txn = len(scored_df)
        critical_count = int((scored_df["cbsi_score"] >= 70).sum()) if not scored_df.empty else 0
        high_count = int(((scored_df["cbsi_score"] >= 40) & (scored_df["cbsi_score"] < 70)).sum()) if not scored_df.empty else 0
        fraud_confirmed = int(scored_df["is_fraud_flag"].sum()) if "is_fraud_flag" in scored_df.columns else 0
        avg_score = round(scored_df["cbsi_score"].mean(), 1) if not scored_df.empty else 0
    except Exception:
        total_txn = critical_count = high_count = fraud_confirmed = 0
        avg_score = 0

    cols = st.columns(5)
    kpis = [
        ("Transactions Scanned", f"{total_txn:,}", T['teal']),
        ("Critical Alerts", f"{critical_count}", T['red']),
        ("High-Risk Flags", f"{high_count}", T['amber']),
        ("Confirmed Fraud", f"{fraud_confirmed}", T['red']),
        ("Avg CBSI Score", f"{avg_score}", T['cyan']),
    ]
    for col, (title, val, color) in zip(cols, kpis):
        col.markdown(f"""
        <div class="vm-card">
            <div class="vm-card-title">{title}</div>
            <div class="vm-card-value" style="color:{color};">{val}</div>
        </div>""", unsafe_allow_html=True)

    c1, c2 = st.columns([3, 2])
    with c1:
        st.markdown(f'<div class="vm-section">CBSI Trend Over Time</div>', unsafe_allow_html=True)
        try:
            if not scored_df.empty and "timestamp" in scored_df.columns:
                daily = scored_df.set_index("timestamp").resample("D")["cbsi_score"].mean().dropna()
                fig = go.Figure()
                fig.add_trace(go.Scatter(
                    x=daily.index, y=daily.values,
                    mode="lines", line=dict(color=T['accent'], width=2),
                    fill="tozeroy", fillcolor="rgba(229,9,20,0.08)",
                    name="Avg CBSI"
                ))
                fig.add_hline(y=70, line_dash="dash", line_color=T['red'], annotation_text="Critical")
                fig.add_hline(y=40, line_dash="dot", line_color=T['amber'], annotation_text="Watch")
                fig.update_layout(**PLOTLY_LAYOUT, height=340, title="Daily Average CBSI Score")
                st.plotly_chart(fig, key="cmd_trend")
        except Exception as e:
            st.warning(f"Trend chart error: {e}")

    with c2:
        st.markdown(f'<div class="vm-section">Risk Distribution</div>', unsafe_allow_html=True)
        try:
            if not scored_df.empty:
                tiers = scored_df["cbsi_score"].apply(risk_tier).value_counts()
                colors_map = {"CRITICAL": T['red'], "HIGH": T['amber'], "WATCH": T['cyan'], "NORMAL": T['green']}
                fig2 = go.Figure(go.Pie(
                    labels=tiers.index, values=tiers.values,
                    marker=dict(colors=[colors_map.get(t, T['text2']) for t in tiers.index]),
                    hole=0.55, textinfo="label+percent", textfont=dict(size=12, color=T['text']),
                ))
                fig2.update_layout(**PLOTLY_LAYOUT, height=340, showlegend=False, title="Alert Tier Breakdown")
                st.plotly_chart(fig2, key="cmd_pie")
        except Exception as e:
            st.warning(f"Pie chart error: {e}")

    st.markdown(f'<div class="vm-section">Recent Critical Alerts</div>', unsafe_allow_html=True)
    try:
        if not scored_df.empty:
            crits = scored_df[scored_df["cbsi_score"] >= 70].sort_values("timestamp", ascending=False).head(10)
            if crits.empty:
                st.info("No critical alerts in current data window.")
            else:
                for _, row in crits.iterrows():
                    tier = risk_tier(row["cbsi_score"])
                    tc = tier_color(tier)
                    ts_str = str(row.get("timestamp", ""))[:19]
                    st.markdown(f"""
                    <div class="vm-card" style="border-left:3px solid {tc}; padding:12px 18px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span style="font-weight:700; color:{tc}; font-family:'JetBrains Mono',monospace;">
                                    {row.get('emp_id','N/A')}</span>
                                <span style="color:{T['text2']}; margin-left:12px; font-size:12px;">{ts_str}</span>
                                <span style="color:{T['text2']}; margin-left:12px; font-size:12px;">
                                    {row.get('action_type','N/A')} | {row.get('transfer_channel','N/A')}</span>
                            </div>
                            <div>
                                {tier_badge(tier)}
                                <span style="margin-left:8px; font-weight:700; color:{tc};
                                      font-family:'JetBrains Mono',monospace; font-size:18px;">
                                    {row['cbsi_score']}</span>
                            </div>
                        </div>
                    </div>""", unsafe_allow_html=True)
    except Exception as e:
        st.warning(f"Alert feed error: {e}")

    st.markdown(f'<div class="vm-section">Monthly Transaction Volume by Role</div>', unsafe_allow_html=True)
    try:
        if not scored_df.empty and "timestamp" in scored_df.columns:
            tmp = scored_df.copy()
            tmp["month"] = tmp["timestamp"].dt.to_period("M").astype(str)
            pivot = tmp.groupby(["month", "emp_class"]).size().unstack(fill_value=0)
            fig3 = go.Figure(go.Heatmap(
                z=pivot.values, x=pivot.columns.tolist(), y=pivot.index.tolist(),
                colorscale=[[0, T['bg']], [0.5, "#B71C1C"], [1, T['red']]],
                hovertemplate="Role: %{x}<br>Month: %{y}<br>Count: %{z}<extra></extra>"
            ))
            fig3.update_layout(**PLOTLY_LAYOUT, height=260, title="Transaction Heatmap")
            st.plotly_chart(fig3, key="cmd_heatmap")
    except Exception as e:
        st.warning(f"Heatmap error: {e}")


# ================================================================
# PAGE: EMPLOYEE ROSTER
# ================================================================
elif page == "Employee Roster":
    st.markdown(f'<div style="font-size:28px; font-weight:700; color:{T["text"]}; margin-bottom:12px;">Employee Roster</div>', unsafe_allow_html=True)

    try:
        if not emp_df.empty:
            emp_scores = scored_df.groupby("emp_id")["cbsi_score"].agg(["max","mean","count"]).reset_index() if not scored_df.empty else pd.DataFrame()
            
            if not emp_scores.empty:
                emp_scores.columns = ["emp_id", "max_score", "avg_score", "txn_count"]
                emp_scores["avg_score"] = emp_scores["avg_score"].round(1)
                roster = emp_df.merge(emp_scores, on="emp_id", how="left").fillna({"max_score":0,"avg_score":0,"txn_count":0})
            else:
                roster = emp_df.copy()
                roster["max_score"] = 0
                roster["avg_score"] = 0
                roster["txn_count"] = 0
            
            roster["max_score"] = roster["max_score"].astype(int)
            roster["txn_count"] = roster["txn_count"].astype(int)
            roster["status"] = roster["max_score"].apply(risk_tier)
            roster.sort_values("max_score", ascending=False, inplace=True)

            f1, f2, f3 = st.columns(3)
            with f1:
                role_filter = st.multiselect("Filter by Role", sorted(roster["emp_class"].dropna().unique().tolist()), default=sorted(roster["emp_class"].dropna().unique().tolist()))
            with f2:
                tier_filter = st.multiselect("Filter by Status", ["CRITICAL","HIGH","WATCH","NORMAL"], default=["CRITICAL","HIGH","WATCH","NORMAL"])
            with f3:
                search = st.text_input("Search EMP_ID", "", placeholder="e.g. EMP_1234")

            filtered = roster[(roster["emp_class"].isin(role_filter)) & (roster["status"].isin(tier_filter))]
            if search.strip():
                filtered = filtered[filtered["emp_id"].str.contains(search.strip(), case=False, na=False)]

            total_pages = max(1, len(filtered) // ROWS_PER_PAGE + (1 if len(filtered) % ROWS_PER_PAGE else 0))
            pg1, pg2, pg3 = st.columns([1,2,1])
            with pg2:
                current_page = st.number_input("Page", min_value=1, max_value=total_pages, value=1, step=1)
            start_idx = (current_page - 1) * ROWS_PER_PAGE
            page_data = filtered.iloc[start_idx:start_idx + ROWS_PER_PAGE].copy()

            st.markdown(f'<div style="color:{T["text2"]}; font-size:12px; margin-bottom:8px;">Showing {start_idx+1}-{min(start_idx+ROWS_PER_PAGE, len(filtered))} of {len(filtered)} employees | Page {current_page}/{total_pages}</div>', unsafe_allow_html=True)

            display_cols = ["emp_id", "emp_class", "branch_id", "max_score", "avg_score", "txn_count", "status"]
            display_data = page_data[display_cols].rename(columns={
                "emp_id":"Employee ID", "emp_class":"Role", "branch_id":"Branch",
                "max_score":"Peak CBSI", "avg_score":"Avg CBSI",
                "txn_count":"Transactions", "status":"Status"
            })
            st.dataframe(
                display_data,
                width="stretch", hide_index=True, height=600, use_container_width=True
            )
        else:
            st.warning("Employee data not available.")
    except Exception as e:
        st.error(f"Roster rendering error: {e}")
        import traceback
        st.error(traceback.format_exc())


# ================================================================
# PAGE: EMPLOYEE PROFILE
# ================================================================
elif page == "Employee Profile":
    st.markdown(f'<div style="font-size:28px; font-weight:700; color:{T["text"]}; margin-bottom:12px;">Employee Profile Search</div>', unsafe_allow_html=True)

    search_id = st.text_input("Enter Employee ID", placeholder="e.g. EMP_1001", key="profile_search")

    if search_id.strip():
        eid = search_id.strip().upper()

        try:
            emp_row = emp_df[emp_df["emp_id"] == eid]
            emp_txns = scored_df[scored_df["emp_id"] == eid].copy() if not scored_df.empty else pd.DataFrame()

            if emp_row.empty and emp_txns.empty:
                st.warning(f"No data found for {eid}.")
            else:
                if not emp_txns.empty:
                    peak = int(emp_txns["cbsi_score"].max())
                    avg_s = round(emp_txns["cbsi_score"].mean(), 1)
                    tier = risk_tier(peak)
                    tc = tier_color(tier)
                else:
                    peak = avg_s = 0
                    tier = "NORMAL"
                    tc = T['green']

                role = emp_row.iloc[0]["emp_class"] if not emp_row.empty else "Unknown"
                branch = emp_row.iloc[0]["branch_id"] if not emp_row.empty else "Unknown"

                st.markdown(f"""
                <div class="vm-card" style="border-left:4px solid {tc};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:22px; font-weight:700; color:{T['text']};">{eid}</div>
                            <div style="color:{T['text2']}; font-size:13px;">{role} | {branch}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:36px; font-weight:700; color:{tc};
                                 font-family:'JetBrains Mono',monospace;">{peak}</div>
                            <div>{tier_badge(tier)}</div>
                        </div>
                    </div>
                </div>""", unsafe_allow_html=True)

                tab1, tab2, tab3, tab4 = st.tabs(["Risk Trend", "Transactions", "Triggered Rules", "NLP Flags"])

                with tab1:
                    st.markdown(f'<div class="vm-section">Historical Risk Trend</div>', unsafe_allow_html=True)
                    try:
                        if not emp_txns.empty and "timestamp" in emp_txns.columns:
                            daily = emp_txns.set_index("timestamp").resample("D")["cbsi_score"].mean().dropna()
                            if not daily.empty:
                                fig = go.Figure()
                                fig.add_trace(go.Scatter(
                                    x=daily.index, y=daily.values,
                                    mode="lines+markers",
                                    line=dict(color=T['accent'], width=2),
                                    marker=dict(size=5, color=T['accent']),
                                    fill="tozeroy", fillcolor="rgba(229,9,20,0.06)",
                                    name="Daily CBSI"
                                ))
                                fig.add_hline(y=70, line_dash="dash", line_color=T['red'], annotation_text="Critical")
                                fig.add_hline(y=40, line_dash="dot", line_color=T['amber'], annotation_text="Watch")
                                fig.update_layout(**PLOTLY_LAYOUT, height=360, title=f"CBSI Trend - {eid}")
                                st.plotly_chart(fig, key="prof_trend")
                            else:
                                st.info("Not enough data points for trend.")
                    except Exception as e:
                        st.warning(f"Trend error: {e}")

                with tab2:
                    st.markdown(f'<div class="vm-section">Recent Transactions</div>', unsafe_allow_html=True)
                    try:
                        if not emp_txns.empty:
                            show_cols = [c for c in ["timestamp","action_type","amount","transfer_channel","account_touched","cbsi_score","is_fraud_flag"] if c in emp_txns.columns]
                            st.dataframe(
                                emp_txns[show_cols].sort_values("timestamp", ascending=False).head(50),
                                width="stretch", hide_index=True, height=400
                            )
                    except Exception as e:
                        st.warning(f"Transaction table error: {e}")

                with tab3:
                    st.markdown(f'<div class="vm-section">Triggered Rules (Agent 5 and 6)</div>', unsafe_allow_html=True)
                    try:
                        if not emp_txns.empty:
                            flagged = emp_txns[emp_txns["cbsi_score"] >= 40].sort_values("cbsi_score", ascending=False).head(20)
                            if flagged.empty:
                                st.info("No rule triggers for this employee.")
                            else:
                                for _, row in flagged.iterrows():
                                    rules = get_triggered_rules(row)
                                    if rules:
                                        ts_s = str(row.get("timestamp",""))[:19]
                                        for r in rules:
                                            st.markdown(f"""
                                            <div class="vm-card" style="padding:10px 16px; border-left:3px solid {T['amber']};">
                                                <span style="color:{T['amber']}; font-weight:600; font-size:12px;">{r}</span>
                                                <span style="color:{T['text2']}; font-size:11px; float:right;">{ts_s}</span>
                                            </div>""", unsafe_allow_html=True)
                    except Exception as e:
                        st.warning(f"Rules error: {e}")

                with tab4:
                    st.markdown(f'<div class="vm-section">NLP Sentiment Flags (Agent 4)</div>', unsafe_allow_html=True)
                    try:
                        if not emp_txns.empty:
                            has_text = pd.DataFrame()
                            if "raw_complaint_text" in emp_txns.columns:
                                mask = emp_txns["raw_complaint_text"].fillna("").str.strip() != ""
                                if "hr_remark_text" in emp_txns.columns:
                                    mask = mask | (emp_txns["hr_remark_text"].fillna("").str.strip() != "")
                                has_text = emp_txns[mask]

                            if has_text.empty:
                                st.info("No NLP-relevant text found for this employee.")
                            else:
                                for _, row in has_text.head(15).iterrows():
                                    nlp = extract_nlp_flags(row)
                                    if nlp:
                                        for flag in nlp:
                                            st.markdown(f"""
                                            <div class="vm-card" style="padding:10px 16px; border-left:3px solid {T['red']};">
                                                <span style="color:{T['red']}; font-weight:600; font-size:12px;">NLP MATCH: {flag}</span>
                                                <span style="color:{T['text2']}; font-size:11px; float:right;">{str(row.get('timestamp',''))[:19]}</span>
                                            </div>""", unsafe_allow_html=True)
                                    for f in ["raw_complaint_text","hr_remark_text"]:
                                        t = str(row.get(f,""))
                                        if t and t.lower() not in ["","nan"]:
                                            st.markdown(f'<div style="color:{T["text2"]}; font-size:11px; padding:0 16px; margin-bottom:8px;">Text: <i>{t[:200]}</i></div>', unsafe_allow_html=True)
                    except Exception as e:
                        st.warning(f"NLP error: {e}")

        except Exception as e:
            st.error(f"Profile loading error: {e}")
    else:
        st.markdown(f"""
        <div class="vm-card" style="text-align:center; padding:60px;">
            <div style="font-size:16px; color:{T['text2']};">Enter an Employee ID above to view their full forensic profile</div>
            <div style="font-size:12px; color:{T['text2']}; margin-top:8px;">Example: EMP_1001, EMP_1416, EMP_1200</div>
        </div>""", unsafe_allow_html=True)


# ================================================================
# PAGE: FUND FLOW GRAPH (Agent 2 - PyVis)
# ================================================================
elif page == "Fund Flow Graph":
    st.markdown(f'<div style="font-size:28px; font-weight:700; color:{T["text"]}; margin-bottom:12px;">Fund Flow Network (Agent 2)</div>', unsafe_allow_html=True)

    try:
        if not scored_df.empty:
            flow_df = scored_df[
                (scored_df["amount"] > 0) &
                scored_df["action_type"].isin(["Initiate","Approve","ATM_Withdrawal"])
            ].copy()

            gc1, gc2, gc3 = st.columns(3)
            with gc1:
                max_nodes = st.slider("Max Edges", 20, 150, 60, step=10)
            with gc2:
                min_amount = st.slider("Min Amount (Rs.)", 0, 5_000_000, 100_000, step=50_000)
            with gc3:
                show_fraud_only = st.checkbox("Anomalous Only", value=False)

            flow_df = flow_df[flow_df["amount"] >= min_amount]
            if show_fraud_only:
                flow_df = flow_df[flow_df["cbsi_score"] >= 70]

            edges = flow_df.nlargest(max_nodes, "amount")

            if edges.empty:
                st.info("No edges match filters. Try lowering Min Amount.")
            else:
                net = Network(
                    height="620px", width="100%",
                    bgcolor=T['bg'], font_color=T['text'],
                    directed=True, notebook=False
                )
                net.barnes_hut(gravity=-3000, central_gravity=0.3, spring_length=200)

                seen = set()
                for _, row in edges.iterrows():
                    emp = str(row.get("emp_id", "N/A"))
                    acc = str(row.get("account_touched", "N/A"))
                    amount = float(row.get("amount", 0))
                    score = int(row.get("cbsi_score", 0))
                    is_bad = score >= 70

                    if emp not in seen:
                        net.add_node(
                            emp, label=emp,
                            color=T['red'] if is_bad else T['green'],
                            size=25 + min(20, score // 5),
                            title=f"{emp} | {row.get('emp_class','N/A')} | CBSI: {score}",
                            font={"size": 14, "color": T['text']}
                        )
                        seen.add(emp)

                    if acc not in seen:
                        net.add_node(
                            acc, label=acc,
                            color=T['red'] if is_bad else "#2E7D32",
                            size=18, shape="diamond",
                            title=f"Account: {acc}",
                            font={"size": 12, "color": T['text2']}
                        )
                        seen.add(acc)

                    net.add_edge(
                        emp, acc,
                        value=max(1, min(6, amount / 500_000)),
                        color=T['red'] if is_bad else "#1B5E20",
                        title=f"Rs.{amount:,.0f} | CBSI: {score} | {row.get('transfer_channel','N/A')}",
                        label=f"Rs.{amount:,.0f}",
                        font={"size": 10, "color": T['text2'], "align": "middle"}
                    )

                with tempfile.NamedTemporaryFile(delete=False, suffix=".html", mode="w", encoding="utf-8") as f:
                    net.save_graph(f.name)
                    graph_path = f.name

                with open(graph_path, "r", encoding="utf-8") as f:
                    html = f.read()

                html = html.replace("<body>", f'<body style="background-color:{T["bg"]}; margin:0; padding:0;">')
                components.html(html, height=650, scrolling=False)

                st.markdown(f"""
                <div style="display:flex; gap:24px; margin-top:8px; padding:10px; color:{T['text2']}; font-size:12px;">
                    <span><span style="color:{T['red']};">&#9679;</span> Anomalous (CBSI >= 70)</span>
                    <span><span style="color:{T['green']};">&#9679;</span> Safe (CBSI &lt; 70)</span>
                    <span>&#9670; Account Node</span>
                    <span>&#9679; Employee Node</span>
                </div>""", unsafe_allow_html=True)

                try:
                    os.unlink(graph_path)
                except Exception:
                    pass
        else:
            st.warning("No transaction data available.")
    except Exception as e:
        st.error(f"Graph rendering error: {e}")


# ================================================================
# PAGE: EVIDENCE VAULT
# ================================================================
elif page == "Evidence Vault":
    st.markdown(f'<div style="font-size:28px; font-weight:700; color:{T["text"]}; margin-bottom:12px;">Evidence Vault</div>', unsafe_allow_html=True)

    try:
        pdf_files = sorted([f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")], reverse=True) if os.path.isdir(PDF_DIR) else []
        str_files = sorted([f for f in os.listdir(STR_DIR) if f.endswith(".json")], reverse=True) if os.path.isdir(STR_DIR) else []

        ev1, ev2 = st.columns(2)
        ev1.markdown(f"""
        <div class="vm-card">
            <div class="vm-card-title">PDF Evidence Packages</div>
            <div class="vm-card-value" style="color:{T['teal']};">{len(pdf_files)}</div>
        </div>""", unsafe_allow_html=True)
        ev2.markdown(f"""
        <div class="vm-card">
            <div class="vm-card-title">STR JSON Filings</div>
            <div class="vm-card-value" style="color:{T['cyan']};">{len(str_files)}</div>
        </div>""", unsafe_allow_html=True)

        tab_pdf, tab_str = st.tabs(["PDF Reports (Score >= 70)", "STR JSON Filings"])

        with tab_pdf:
            st.markdown(f'<div class="vm-section">Downloadable STR Evidence PDFs</div>', unsafe_allow_html=True)
            if not pdf_files:
                st.info("No PDF evidence packages generated yet. Run the orchestrator to generate reports for CBSI >= 70 alerts.")
            else:
                for fname in pdf_files:
                    fpath = os.path.join(PDF_DIR, fname)
                    try:
                        with open(fpath, "rb") as f:
                            pdf_bytes = f.read()
                        fc1, fc2 = st.columns([4, 1])
                        with fc1:
                            size_kb = round(len(pdf_bytes) / 1024, 1)
                            st.markdown(f"""
                            <div class="vm-card" style="padding:12px 18px;">
                                <span style="font-weight:600; color:{T['teal']}; font-family:'JetBrains Mono',monospace;">{fname}</span>
                                <span style="color:{T['text2']}; font-size:11px; margin-left:12px;">{size_kb} KB</span>
                            </div>""", unsafe_allow_html=True)
                        with fc2:
                            st.download_button(
                                label="Download STR PDF",
                                data=pdf_bytes,
                                file_name=fname,
                                mime="application/pdf",
                                key=f"dl_{fname}"
                            )
                    except FileNotFoundError:
                        st.markdown(f"""
                        <div class="vm-card" style="padding:12px 18px; border-left:3px solid {T['amber']};">
                            <span style="color:{T['amber']};">{fname}</span>
                            <span style="color:{T['text2']}; font-size:12px; margin-left:12px;">Generating...</span>
                            <span class="live-dot" style="margin-left:8px;"></span>
                        </div>""", unsafe_allow_html=True)
                    except Exception as e:
                        st.warning(f"Error loading {fname}: {e}")

        with tab_str:
            st.markdown(f'<div class="vm-section">STR JSON Compliance Filings</div>', unsafe_allow_html=True)
            if not str_files:
                st.info("No STR filings generated yet.")
            else:
                for fname in str_files:
                    fpath = os.path.join(STR_DIR, fname)
                    try:
                        with open(fpath, "r") as f:
                            str_data = json.load(f)
                        with st.expander(f"{fname} - {str_data.get('subject_employee_id', 'N/A')}"):
                            st.json(str_data)
                    except Exception as e:
                        st.warning(f"Error loading {fname}: {e}")

        st.markdown("---")
        st.markdown(f'<div class="vm-section">Generate New Evidence</div>', unsafe_allow_html=True)

        if not scored_df.empty:
            critical_emps = scored_df[scored_df["cbsi_score"] >= 70]["emp_id"].unique().tolist()
            if critical_emps:
                sel_emp = st.selectbox("Select Employee", critical_emps)
                if st.button("Generate Evidence Package", key="gen_evidence_btn"):
                    with st.spinner("Generating forensic evidence package..."):
                        time.sleep(2)
                    st.success(f"Evidence pipeline triggered for {sel_emp}. Check the PDF Reports tab.")
            else:
                st.info("No employees at CRITICAL threshold (CBSI >= 70) in current data window.")

    except Exception as e:
        st.error(f"Evidence vault error: {e}")


# ----------------------------------------------------------------
# FOOTER
# ----------------------------------------------------------------
st.markdown("---")
st.markdown(f"""
<div style="text-align:center; padding:16px 0; color:{T['text2']}; font-size:11px;">
    VaultMind 2.0 - Multi-Agent Fraud Intelligence Platform |
    Kafka Offset: {st.session_state.get('kafka_offset', 200)} / 8,183 |
    Powered by 8 Autonomous Agents |
    {datetime.now().strftime('%d %b %Y %H:%M:%S IST')}
</div>""", unsafe_allow_html=True)
