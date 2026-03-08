import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { ClipboardCheck } from "lucide-react";
import { useOutletContext } from "react-router-dom";

type WarehouseViewContext = { warehouse: Warehouse };

export default function WarehouseViewInspectionsPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Inspections
        </CardTitle>
        <CardDescription>
          Inspections carried out at this warehouse ({warehouse.name}). Will be
          wired to the API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          No inspections linked yet. This section will list inspections for
          warehouse {warehouse.warehouse_code}.
        </p>
      </CardContent>
    </Card>
  );
}
