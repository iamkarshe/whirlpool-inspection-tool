import InspectionsDataTable from "@/pages/dashboard/transactions/inspections/inspections-data-table";
import type { Inspection } from "@/pages/dashboard/transactions/inspections/inspection-service";
import { getInspectionsByUserId } from "@/pages/dashboard/transactions/inspections/inspection-service";
import type { User } from "@/pages/dashboard/admin/users/user-service";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type UserViewContext = { user: User };

export default function UserViewInspectionsPage() {
  const { user } = useOutletContext<UserViewContext>();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInspectionsByUserId(user.id)
      .then((data) => {
        if (!cancelled) setInspections(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <InspectionsDataTable
      data={inspections}
      hideDeviceColumn={false}
    />
  );
}
