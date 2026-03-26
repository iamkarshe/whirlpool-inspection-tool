import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { WarehouseHeaderBadges } from "@/pages/dashboard/admin/warehouses/warehouse-badge";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { loadWarehouseView } from "@/pages/dashboard/admin/warehouses/warehouse-view/controller";
import { TabbedContent } from "@/components/tabbed-content";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";

export default function WarehouseViewLayout() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [warehouse, setWarehouse] = useState<Warehouse | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    loadWarehouseView(id)
      .then((d) => {
        if (!cancelled) setWarehouse(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (warehouse === null || warehouse === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Warehouse not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.DASHBOARD_MASTERS_WAREHOUSES}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to warehouses
          </Link>
        </Button>
      </div>
    );
  }

  const basePath = PAGES.warehouseViewPath(warehouse.id);
  const usersPath = PAGES.warehouseUsersPath(warehouse.id);
  const devicesPath = PAGES.warehouseDevicesPath(warehouse.id);
  const inspectionsPath = PAGES.warehouseInspectionsPath(warehouse.id);
  const tabs = [
    { label: "Details", to: basePath, end: true },
    { label: "Users", to: usersPath },
    { label: "Devices", to: devicesPath },
    { label: "Inspections", to: inspectionsPath },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to={PAGES.DASHBOARD_MASTERS_WAREHOUSES}
            aria-label="Back to warehouses"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {warehouse.name}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <WarehouseHeaderBadges warehouse={warehouse} />
          </div>
        </div>
      </div>

      <TabbedContent tabs={tabs} className="my-0">
        <Outlet context={{ warehouse }} />
      </TabbedContent>
    </div>
  );
}
