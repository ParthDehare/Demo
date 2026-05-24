export function LoadingShimmer({ t }) {
  return (
    <div className="space-y-4">
      {Array(5).fill(0).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-sm animate-pulse"
          style={{ background: `${t.border}44` }}
        />
      ))}
    </div>
  );
}
