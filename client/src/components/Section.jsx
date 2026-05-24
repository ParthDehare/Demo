export function Section({ title, t }) {
  return (
    <div
      className="text-[13px] font-bold uppercase tracking-[2px] py-2.5 border-b mb-4"
      style={{ color: t.text2, borderColor: t.border }}
    >
      {title}
    </div>
  );
}
