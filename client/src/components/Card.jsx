export function Card({ children, t, className = "", style = {}, ...props }) {
  return (
    <div
      className={`rounded-sm border p-5 transition-colors duration-200 ${className}`}
      style={{
        background: t.card, borderColor: t.border,
        boxShadow: "0 0 10px rgba(0,0,0,0.4)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
