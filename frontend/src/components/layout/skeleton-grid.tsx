interface SkeletonGridProps {
  count?: number;
  height?: string;
  className?: string;
}

export function SkeletonGrid({ 
  count = 3, 
  height = "h-64",
  className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
}: SkeletonGridProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-muted/20 animate-pulse rounded-2xl border border-border/50`}
        />
      ))}
    </div>
  );
}
