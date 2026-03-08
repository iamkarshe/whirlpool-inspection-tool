import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeviceKpis } from "@/pages/dashboard/admin/devices/device-service";
import {
  Smartphone,
  Monitor,
  CircleDot,
  LayoutGrid,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const statConfig = [
  {
    name: "Total devices",
    stat: (k: DeviceKpis) => k.totalDevices.toLocaleString(),
    change: (k: DeviceKpis) => k.totalChange,
    changeType: (k: DeviceKpis) => k.totalChangeType,
    icon: LayoutGrid,
  },
  {
    name: "Active now",
    stat: (k: DeviceKpis) => k.activeDevices.toLocaleString(),
    change: (k: DeviceKpis) => k.activeChange,
    changeType: (k: DeviceKpis) => k.activeChangeType,
    icon: CircleDot,
  },
  {
    name: "Mobile",
    stat: (k: DeviceKpis) => k.mobileDevices.toLocaleString(),
    change: (k: DeviceKpis) => k.mobileChange,
    changeType: (k: DeviceKpis) => k.mobileChangeType,
    icon: Smartphone,
  },
  {
    name: "Desktop",
    stat: (k: DeviceKpis) => k.desktopDevices.toLocaleString(),
    change: (k: DeviceKpis) => k.desktopChange,
    changeType: (k: DeviceKpis) => k.desktopChangeType,
    icon: Monitor,
  },
];

interface DeviceStatCardsProps {
  kpis: DeviceKpis;
}

export function DeviceStatCards({ kpis }: DeviceStatCardsProps) {
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
