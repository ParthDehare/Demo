import { TIER_COLORS } from "../utils.js";

export function Badge({ tier, t }) {
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
