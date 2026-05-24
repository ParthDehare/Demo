import { useState } from "react";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from "recharts";
import { Card } from "./Card.jsx";
import { Section } from "./Section.jsx";
import { getTriggeredRules, extractNlpFlags } from "../data.js";
import { riskTier } from "../utils.js";

export function ProfileTabs({ t, tc, trendData, txns, flaggedTxns, nlpTxns, eid, isCritical, isCalm }) {
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
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="profileStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="25%" stopColor="#ef4444" />
                    <stop offset="25%" stopColor="#00B4D8" />
                    <stop offset="100%" stopColor="#00B4D8" />
                  </linearGradient>
                  <linearGradient id="profileFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="25%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="25%" stopColor="#00B4D8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00B4D8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke={t.border} opacity={0.25} />
                <XAxis dataKey="date" tick={{ fill: t.text2, fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: t.text2, fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, borderRadius: 8 }} />
                <Area type="monotone" dataKey="cbsi" stroke="url(#profileStroke)" strokeWidth={2} fill="url(#profileFill)" dot={false} />
              </AreaChart>
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
