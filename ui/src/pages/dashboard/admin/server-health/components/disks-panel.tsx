import { HardDrive } from "lucide-react";

import type { ServerDiskInfo } from "@/api/generated/model/serverDiskInfo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResourceUsageBar } from "@/pages/dashboard/admin/server-health/components/resource-usage-bar";
import { formatServerBytes } from "@/services/server-health-api";
import { cn } from "@/lib/utils";

export type DisksPanelProps = {
  disks: ServerDiskInfo[];
  className?: string;
};

export function DisksPanel({ disks, className }: DisksPanelProps) {
  const criticalCount = disks.filter((disk) => disk.percent >= 85).length;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="text-muted-foreground h-4 w-4" />
              Disks
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Local mountpoints sorted by usage.
            </p>
          </div>
          {disks.length > 0 ? (
            <Badge variant="outline">{disks.length} volumes</Badge>
          ) : null}
          {criticalCount > 0 ? (
            <Badge variant="warning">{criticalCount} high usage</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {disks.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No disk usage data available.
          </p>
        ) : (
          disks.map((disk) => (
            <div
              key={`${disk.device}-${disk.mountpoint}`}
              className={cn(
                "space-y-2 rounded-lg border p-3",
                disk.percent >= 85 && "border-destructive/40 bg-destructive/5",
                disk.percent >= 70 &&
                  disk.percent < 85 &&
                  "border-amber-500/30 bg-amber-500/5",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {disk.mountpoint}
                  </span>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {disk.fstype}
                  </Badge>
                </div>
                <span className="text-muted-foreground font-mono text-xs">
                  {disk.device}
                </span>
              </div>
              <ResourceUsageBar
                label="Used"
                percent={disk.percent}
                detail={`${formatServerBytes(disk.used_bytes)} used · ${formatServerBytes(disk.free_bytes)} free`}
                warnAt={85}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
