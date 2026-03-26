import { cn } from "@/lib/utils";

type KpiLoaderProps = {
  count: number;
  className?: string;
  itemClassName?: string;
};

export default function KpiLoader({
  count,
  className,
  itemClassName,
}: KpiLoaderProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn("h-[88px] animate-pulse rounded-lg border bg-muted/50", itemClassName)}
        />
      ))}
    </div>
  );
}
