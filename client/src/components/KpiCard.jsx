import { Card } from "./Card.jsx";

export function KpiCard({ title, value, color, t }) {
  return (
    <Card t={t}>
      <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: t.text2 }}>
        {title}
      </div>
      <div className="text-3xl font-bold font-mono" style={{ color }}>{value}</div>
    </Card>
  );
}
