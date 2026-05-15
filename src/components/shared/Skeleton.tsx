interface SkeletonProps {
  variant?: "text" | "row";
  lines?: number;
  className?: string;
}

export function Skeleton({ variant = "text", lines = 3, className = "" }: SkeletonProps) {
  if (variant === "row") {
    return (
      <div
        className={`h-7 w-full rounded-sm bg-surface-2 animate-pulse ${className}`}
      />
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-sm bg-surface-2 animate-pulse"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}
