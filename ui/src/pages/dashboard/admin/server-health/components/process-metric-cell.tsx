import { Progress } from "@/components/ui/progress";
import { usageProgressClass } from "@/services/server-health-api";
import { cn } from "@/lib/utils";

export type ProcessMetricCellProps = {
  value: number;
  kind: "cpu" | "memory";
  warnAt?: number;
};

export function ProcessMetricCell({
  value,
  kind,
  warnAt = kind === "cpu" ? 15 : 10,
}: ProcessMetricCellProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const hot = clamped >= warnAt;

  return (
    <div className="flex min-w-[5.5rem] flex-col items-end gap-1">
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          hot && "text-amber-600 dark:text-amber-400",
          clamped >= 40 && "text-destructive",
        )}
      >
        {clamped.toFixed(1)}%
      </span>
      <Progress
        value={clamped}
        className="h-1.5 w-full"
        indicatorColor={usageProgressClass(clamped, warnAt)}
        aria-label={`${kind} usage`}
      />
    </div>
  );
}
