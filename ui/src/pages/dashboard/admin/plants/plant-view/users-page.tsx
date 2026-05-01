import type { User } from "@/pages/dashboard/admin/users/user-service";
import type { Plant } from "@/pages/dashboard/admin/plants/plant-service";
import { getUsersByPlantId } from "@/pages/dashboard/admin/plants/plant-view/plant-view-service";
import UsersDataTable from "@/pages/dashboard/admin/users/data-table";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type PlantViewContext = { plant: Plant };

export default function PlantViewUsersPage() {
  const { plant } = useOutletContext<PlantViewContext>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUsersByPlantId(plant.id)
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plant.id]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <UsersDataTable data={users} />;
}
