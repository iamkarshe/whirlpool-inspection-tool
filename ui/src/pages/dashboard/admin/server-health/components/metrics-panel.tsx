import { Activity, Cpu, Gauge, MemoryStick } from "lucide-react";

import type { ServerHealthSnapshot } from "@/api/generated/model/serverHealthSnapshot";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResourceUsageBar } from "@/pages/dashboard/admin/server-health/components/resource-usage-bar";
import {
  formatServerBytes,
  formatServerUptime,
} from "@/services/server-health-api";
import { cn } from "@/lib/utils";

export type MetricsPanelProps = {
  snapshot: ServerHealthSnapshot;
  className?: string;
};

export function MetricsPanel({ snapshot, className }: MetricsPanelProps) {
  const { cpu, memory, swap, load_average: load, host } = snapshot;
  const loadHigh = load.load_1m > cpu.logical_cpu_count;
  const perCore = cpu.per_cpu_percent ?? [];

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="text-muted-foreground h-4 w-4" />
              System metrics
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {host.hostname} · uptime {formatServerUptime(host.uptime_seconds)}
            </p>
          </div>
          <Badge variant="outline">{cpu.logical_cpu_count} cores</Badge>
        </div>
        <p className="text-muted-foreground mt-2 truncate text-xs" title={host.platform}>
          {host.platform}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResourceUsageBar
          label="CPU"
          percent={cpu.percent}
          detail={`${cpu.logical_cpu_count} logical cores`}
          warnAt={90}
        />
        {perCore.length > 0 ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <Cpu className="h-3.5 w-3.5" />
              Per core
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {perCore.map((value, index) => (
                <div key={`core-${index}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-muted-foreground text-[10px]">
                      C{index + 1}
                    </span>
                    <span className="text-[10px] font-medium tabular-nums">
                      {value.toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary transition-all",
                        value >= 85 && "bg-destructive",
                        value >= 70 && value < 85 && "bg-amber-500",
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <ResourceUsageBar
          label="Memory"
          percent={memory.percent}
          detail={`${formatServerBytes(memory.used_bytes)} / ${formatServerBytes(memory.total_bytes)}`}
        />

        {swap.total_bytes > 0 ? (
          <ResourceUsageBar
            label="Swap"
            percent={swap.percent}
            detail={`${formatServerBytes(swap.used_bytes)} / ${formatServerBytes(swap.total_bytes)}`}
          />
        ) : null}

        <div
          className={cn(
            "rounded-lg border p-3",
            loadHigh
              ? "border-destructive/40 bg-destructive/5"
              : "bg-muted/20",
          )}
        >
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Gauge className="text-muted-foreground h-4 w-4" />
            Load average
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-lg tabular-nums",
              loadHigh && "text-destructive",
            )}
          >
            {load.load_1m.toFixed(2)}
            <span className="text-muted-foreground mx-1.5 text-sm">/</span>
            {load.load_5m.toFixed(2)}
            <span className="text-muted-foreground mx-1.5 text-sm">/</span>
            {load.load_15m.toFixed(2)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            1m / 5m / 15m
            {loadHigh ? (
              <span className="text-destructive ml-2">
                · exceeds {cpu.logical_cpu_count} cores
              </span>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <MemoryStick className="h-3.5 w-3.5" />
              Available
            </p>
            <p className="mt-0.5 font-medium tabular-nums">
              {formatServerBytes(memory.available_bytes)}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-muted-foreground">Boot time</p>
            <p className="mt-0.5 truncate font-medium" title={host.boot_time}>
              {host.boot_time}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
