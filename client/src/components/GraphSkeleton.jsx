export function GraphSkeleton({ t, height = 300 }) {
  return (
    <div
      className="w-full rounded-lg animate-pulse overflow-hidden"
      style={{ height, background: `${t.border}33` }}
    >
      <div className="h-full w-full flex items-end gap-3 p-6">
        {Array(8).fill(0).map((_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: "12%",
              height: `${30 + i * 8}px`,
              background: `${t.border}66`
            }}
          />
        ))}
      </div>
    </div>
  );
}
