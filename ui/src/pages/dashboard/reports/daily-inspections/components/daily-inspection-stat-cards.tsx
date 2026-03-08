import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DailyInspectionKpis } from "@/pages/dashboard/reports/daily-inspections/daily-inspection-service";
import {
  ClipboardCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const statConfig = [
  {
    key: "total" as const,
    name: "Total inspections",
    stat: (k: DailyInspectionKpis) => k.total.toLocaleString(),
    change: (k: DailyInspectionKpis) => k.totalChange,
    changeType: (k: DailyInspectionKpis) => k.totalChangeType,
    icon: ClipboardCheck,
  },
  {
    key: "inbound" as const,
    name: "Inbound",
    stat: (k: DailyInspectionKpis) => k.inbound.toLocaleString(),
    change: (k: DailyInspectionKpis) => k.inboundChange,
    changeType: (k: DailyInspectionKpis) => k.inboundChangeType,
    icon: ArrowDownToLine,
  },
  {
    key: "outbound" as const,
    name: "Outbound",
    stat: (k: DailyInspectionKpis) => k.outbound.toLocaleString(),
    change: (k: DailyInspectionKpis) => k.outboundChange,
    changeType: (k: DailyInspectionKpis) => k.outboundChangeType,
    icon: ArrowUpFromLine,
  },
  {
    key: "inspectors" as const,
    name: "Active inspectors",
    stat: (k: DailyInspectionKpis) => k.uniqueInspectors.toLocaleString(),
    change: (k: DailyInspectionKpis) => k.inspectorsChange,
    changeType: (k: DailyInspectionKpis) => k.inspectorsChangeType,
    icon: Users,
  },
];

interface DailyInspectionStatCardsProps {
  kpis: DailyInspectionKpis;
}

export function DailyInspectionStatCards({ kpis }: DailyInspectionStatCardsProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statConfig.map(({ name, stat, change, changeType, icon: Icon }) => {
        const type = changeType(kpis);
        return (
          <Card key={name} className="w-full p-6 py-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-4 w-4 shrink-0" />
                  {name}
                </dt>
                <Badge
                  variant="outline"
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 ps-2.5 text-xs font-medium",
                    type === "positive"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                  )}
                >
                  {type === "positive" ? (
                    <TrendingUp className="mr-0.5 -ml-1 h-5 w-5 shrink-0 self-center text-green-500" />
                  ) : (
                    <TrendingDown className="mr-0.5 -ml-1 h-5 w-5 shrink-0 self-center text-red-500" />
                  )}
                  <span className="sr-only">
                    {type === "positive" ? "Increased" : "Decreased"} by
                  </span>
                  {change(kpis)}
                </Badge>
              </div>
              <dd className="text-foreground mt-2 text-3xl font-semibold">
                {stat(kpis)}
              </dd>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
