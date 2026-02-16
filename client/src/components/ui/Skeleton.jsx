export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonBlock key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
