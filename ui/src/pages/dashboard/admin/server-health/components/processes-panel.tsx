import { Cpu, Flame, User } from "lucide-react";

import type { ServerProcessInfo } from "@/api/generated/model/serverProcessInfo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeDisplay } from "@/components/time-display";
import { ProcessMetricCell } from "@/pages/dashboard/admin/server-health/components/process-metric-cell";
import { cn } from "@/lib/utils";

type ProcessTableProps = {
  title: string;
  description?: string;
  processes: ServerProcessInfo[];
  variant: "top" | "hot";
  emptyMessage?: string;
};

function processStatusVariant(
  status: string,
): "success" | "secondary" | "warning" | "destructive" | "outline" {
  const normalized = status.trim().toLowerCase();
  if (normalized === "running") return "success";
  if (normalized === "sleeping" || normalized === "idle") return "secondary";
  if (normalized === "zombie" || normalized === "stopped") return "destructive";
  if (
    normalized === "disk-sleep" ||
    normalized === "uninterruptible" ||
    normalized === "waiting"
  ) {
    return "warning";
  }
  return "outline";
}

function isHotProcess(process: ServerProcessInfo): boolean {
  return process.cpu_percent >= 5 || process.memory_percent >= 5;
}

function peakLoad(process: ServerProcessInfo): number {
  return Math.max(process.cpu_percent, process.memory_percent);
}

function rankClass(rank: number): string {
  if (rank === 1) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (rank === 2) return "bg-slate-400/15 text-slate-700 dark:text-slate-300";
  if (rank === 3) return "bg-orange-600/15 text-orange-800 dark:text-orange-300";
  return "bg-muted text-muted-foreground";
}

function ProcessTable({
  title,
  description,
  processes,
  variant,
  emptyMessage = "No processes to show.",
}: ProcessTableProps) {
  const Icon = variant === "hot" ? Flame : Cpu;
  const peak =
    processes.length > 0
      ? Math.max(...processes.map((process) => peakLoad(process)))
      : 0;
  const leader = processes[0];

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon
                className={cn(
                  "h-4 w-4",
                  variant === "hot"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground",
                )}
              />
              {title}
            </CardTitle>
            {description ? (
              <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {processes.length > 0 ? (
              <Badge variant="outline">{processes.length} shown</Badge>
            ) : null}
            {leader && variant === "top" ? (
              <Badge variant="secondary" className="max-w-[12rem] truncate">
                Peak {leader.cpu_percent.toFixed(1)}% · {leader.name}
              </Badge>
            ) : null}
            {variant === "hot" && peak >= 5 ? (
              <Badge variant="warning">Peak {peak.toFixed(1)}%</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {processes.length === 0 ? (
          <p className="text-muted-foreground px-6 py-10 text-center text-sm">
            {emptyMessage}
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  {variant === "top" ? (
                    <TableHead className="w-12">#</TableHead>
                  ) : null}
                  <TableHead>Process</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">CPU</TableHead>
                  <TableHead className="text-right">Memory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((process, index) => {
                  const rank = index + 1;
                  const hot = isHotProcess(process);
                  const intense = peakLoad(process) >= 20;

                  return (
                    <TableRow
                      key={`${process.pid}-${process.name}-${index}`}
                      className={cn(
                        hot && "bg-amber-500/5",
                        intense && "bg-destructive/5",
                        variant === "top" &&
                          rank <= 3 &&
                          "bg-muted/30",
                      )}
                    >
                      {variant === "top" ? (
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                              rankClass(rank),
                            )}
                          >
                            {rank}
                          </span>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="max-w-[11rem] truncate font-medium">
                            {process.name}
                          </p>
                          <p className="text-muted-foreground font-mono text-xs tabular-nums">
                            PID {process.pid}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {process.username ? (
                          <Badge
                            variant="outline"
                            className="gap-1 font-normal capitalize"
                          >
                            <User className="h-3 w-3" />
                            {process.username}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ProcessMetricCell
                          value={process.cpu_percent}
                          kind="cpu"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <ProcessMetricCell
                          value={process.memory_percent}
                          kind="memory"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={processStatusVariant(process.status)}
                          className="capitalize"
                        >
                          {process.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <TimeDisplay iso={process.create_time} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type ProcessesPanelProps = {
  processes: ServerProcessInfo[];
  slowProcesses: ServerProcessInfo[];
};

export function ProcessesPanel({
  processes,
  slowProcesses,
}: ProcessesPanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ProcessTable
        title="Top processes (CPU)"
        description="Highest CPU consumers on the host, refreshed live."
        processes={processes}
        variant="top"
      />
      <ProcessTable
        title="Slow / hot processes"
        description="Processes at or above 5% CPU or memory usage."
        processes={slowProcesses}
        variant="hot"
        emptyMessage="No hot processes above the threshold."
      />
    </div>
  );
}
