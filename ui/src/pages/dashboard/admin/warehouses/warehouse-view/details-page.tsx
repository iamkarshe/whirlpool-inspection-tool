import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  WarehouseCodeBadge
} from "@/pages/dashboard/admin/warehouses/warehouse-badge";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { MapPin } from "lucide-react";
import { useOutletContext } from "react-router-dom";

type WarehouseViewContext = { warehouse: Warehouse };

export default function WarehouseViewDetailsPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();

  return (
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
                ID {warehouse.id.slice(0, 8)}…
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
          <p className="text-sm">{warehouse.address}</p>
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
  );
}
