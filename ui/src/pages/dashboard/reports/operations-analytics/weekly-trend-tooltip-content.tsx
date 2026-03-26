import { Badge } from "@/components/ui/badge";

type WeeklyTrendTooltipContentProps = {
  value: number;
  name: string;
  color?: string;
};

export function WeeklyTrendTooltipContent({
  value,
  name,
  color,
}: WeeklyTrendTooltipContentProps) {
  const label =
    name === "inspections"
      ? "Inspections"
      : name === "logins"
        ? "Logins"
        : "Devices";

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-[3px] border"
          style={{
            backgroundColor: color || "var(--muted-foreground)",
            borderColor: color || "var(--muted-foreground)",
          }}
        />
        <Badge variant="secondary" className="text-[10px] font-normal">
          {label}
        </Badge>
      </div>
      <span className="font-mono font-medium tabular-nums text-foreground">
        {Number(value).toLocaleString()}
      </span>
    </div>
  );
}
