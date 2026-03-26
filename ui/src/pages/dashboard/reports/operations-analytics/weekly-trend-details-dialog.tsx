import { ArrowUpRight, ClipboardCheck, LogIn, Monitor } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAGES } from "@/endpoints";
import type { OperationsTrendPoint } from "@/pages/dashboard/reports/operations-analytics/operations-analytics-service";

type WeeklyTrendDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  point: OperationsTrendPoint | null;
};

export function WeeklyTrendDetailsDialog({
  open,
  onOpenChange,
  point,
}: WeeklyTrendDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Weekly activity details</DialogTitle>
          <DialogDescription>
            {point
              ? `Detailed view for ${point.week}. Select a metric to open the relevant module.`
              : "Select a week from the trend chart to view details."}
          </DialogDescription>
        </DialogHeader>

        {point ? (
          <div className="grid gap-2">
              <Link
                to={PAGES.DASHBOARD_INSPECTIONS}
                className="group flex items-center justify-between rounded-lg border bg-background px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2 text-sm">
                  <ClipboardCheck className="h-4 w-4 text-[var(--chart-1)]" />
                  Inspections
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono tabular-nums">
                    {point.inspections.toLocaleString()}
                  </Badge>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link
                to={PAGES.DASHBOARD_ADMIN_LOGINS}
                className="group flex items-center justify-between rounded-lg border bg-background px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2 text-sm">
                  <LogIn className="h-4 w-4 text-[var(--chart-2)]" />
                  Logins
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono tabular-nums">
                    {point.logins.toLocaleString()}
                  </Badge>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link
                to={PAGES.DASHBOARD_ADMIN_DEVICES}
                className="group flex items-center justify-between rounded-lg border bg-background px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Monitor className="h-4 w-4 text-[var(--chart-3)]" />
                  Devices
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono tabular-nums">
                    {point.devices.toLocaleString()}
                  </Badge>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
