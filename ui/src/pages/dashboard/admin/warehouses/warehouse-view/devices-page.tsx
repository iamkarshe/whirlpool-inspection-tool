import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { Smartphone } from "lucide-react";
import { useOutletContext } from "react-router-dom";

type WarehouseViewContext = { warehouse: Warehouse };

export default function WarehouseViewDevicesPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Devices
        </CardTitle>
        <CardDescription>
          Devices used or registered at this warehouse ({warehouse.name}). Will
          be wired to the API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          No devices linked yet. This section will list devices for warehouse{" "}
          {warehouse.warehouse_code}.
        </p>
      </CardContent>
    </Card>
  );
}
