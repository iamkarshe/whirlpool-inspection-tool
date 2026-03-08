import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { Users } from "lucide-react";
import { useOutletContext } from "react-router-dom";

type WarehouseViewContext = { warehouse: Warehouse };

export default function WarehouseViewUsersPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Users
        </CardTitle>
        <CardDescription>
          Users assigned or linked to this warehouse ({warehouse.name}). Will be
          wired to the API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          No users linked yet. This section will list users for warehouse{" "}
          {warehouse.warehouse_code}.
        </p>
      </CardContent>
    </Card>
  );
}
