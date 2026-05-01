import { MapPin } from "lucide-react";
import { useOutletContext } from "react-router-dom";

import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WarehouseCodeBadge } from "@/pages/dashboard/admin/warehouses/warehouse-badge";
import type { WarehouseViewContext } from "@/pages/dashboard/admin/warehouses/warehouse-view/context";

export default function WarehouseViewDetailsPage() {
  const { warehouse, users, devices } = useOutletContext<WarehouseViewContext>();
  const stats = warehouse.stats;
  const kpis: KpiCardProps[] = [
    {
      label: "Total inspections",
      value: stats?.total_inspections ?? 0,
    },
    {
      label: "Users",
      value: stats?.users_count ?? users.length,
    },
    {
      label: "Devices",
      value: stats?.devices_count ?? devices.length,
    },
    {
      label: "Inbound total",
      value: stats?.inbound_total ?? 0,
    },
    {
      label: "Inbound in review",
      value: stats?.inbound_in_review ?? 0,
    },
    {
      label: "Outbound total",
      value: stats?.outbound_total ?? 0,
    },
    {
      label: "Outbound in review",
      value: stats?.outbound_in_review ?? 0,
    },
    {
      label: "Quality pass rate",
      value:
        stats && stats.total_inspections > 0
          ? `${Math.round(
              ((stats.inbound_approved + stats.outbound_approved) /
                stats.total_inspections) *
                100,
            )}%`
          : "0%",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Quality Summary</h2>
        <KpiCardGrid cards={kpis} />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>{warehouse.name}</CardTitle>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <WarehouseCodeBadge code={warehouse.warehouse_code} />
                <Badge variant="outline" className="text-xs font-normal">
                  ID {warehouse.uuid}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Code</p>
            <WarehouseCodeBadge code={warehouse.warehouse_code} />
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Address</p>
            <p className="text-sm whitespace-pre-line">{warehouse.address}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">City</p>
            <p className="text-sm">{warehouse.city}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Postal code</p>
            <p className="font-mono text-sm">{warehouse.postal_code}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Latitude</p>
            <p className="font-mono text-sm">
              {warehouse.lat != null ? warehouse.lat.toFixed(4) : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Longitude</p>
            <p className="font-mono text-sm">
              {warehouse.lng != null ? warehouse.lng.toFixed(4) : "—"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
