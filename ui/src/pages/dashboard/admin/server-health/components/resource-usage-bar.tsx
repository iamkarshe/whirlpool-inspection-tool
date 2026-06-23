import { Progress } from "@/components/ui/progress";
import { usageProgressClass } from "@/services/server-health-api";
import { cn } from "@/lib/utils";

export type ResourceUsageBarProps = {
  label: string;
  percent: number;
  detail?: string;
  warnAt?: number;
  className?: string;
};

export function ResourceUsageBar({
  label,
  percent,
  detail,
  warnAt = 85,
  className,
}: ResourceUsageBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const indicatorClass = usageProgressClass(clamped, warnAt);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {clamped.toFixed(1)}%
          {detail ? ` · ${detail}` : null}
        </span>
      </div>
      <Progress
        value={clamped}
        indicatorColor={indicatorClass}
        aria-label={`${label} usage`}
      />
    </div>
  );
}
