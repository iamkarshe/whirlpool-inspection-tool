import { Badge } from "@/components/ui/badge";

type ExecutiveTooltipContentProps = {
  label: string;
  value: number | string;
  color?: string;
  suffix?: string;
};

export function ExecutiveTooltipContent({
  label,
  value,
  color,
  suffix,
}: ExecutiveTooltipContentProps) {
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
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix ?? ""}
      </span>
    </div>
  );
}
