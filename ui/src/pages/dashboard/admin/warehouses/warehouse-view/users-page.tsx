import UsersDataTable from "@/pages/dashboard/admin/users/data-table";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { getUsersByWarehouseId } from "@/pages/dashboard/admin/warehouses/warehouse-view/warehouse-view-service";
import type { User } from "@/pages/dashboard/admin/users/user-service";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type WarehouseViewContext = { warehouse: Warehouse };

export default function WarehouseViewUsersPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUsersByWarehouseId(warehouse.id)
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouse.id]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <UsersDataTable data={users} />;
}
