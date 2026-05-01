import { TabbedContent } from "@/components/tabbed-content";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { PlantHeaderBadges } from "@/pages/dashboard/admin/plants/plant-badge";
import type { Plant } from "@/pages/dashboard/admin/plants/plant-service";
import { loadPlantView } from "@/pages/dashboard/admin/plants/plant-view/controller";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";

export default function PlantViewLayout() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [plant, setPlant] = useState<Plant | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    loadPlantView(id)
      .then((d) => {
        if (!cancelled) setPlant(d);
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

  if (plant === null || plant === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Plant not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.DASHBOARD_MASTERS_PLANTS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to plants
          </Link>
        </Button>
      </div>
    );
  }

  const basePath = PAGES.plantViewPath(plant.id);
  const usersPath = PAGES.plantUsersPath(plant.id);
  const devicesPath = PAGES.plantDevicesPath(plant.id);
  const inspectionsPath = PAGES.plantInspectionsPath(plant.id);
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
          <Link to={PAGES.DASHBOARD_MASTERS_PLANTS}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{plant.name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <PlantHeaderBadges plant={plant} />
          </div>
        </div>
      </div>

      <TabbedContent tabs={tabs} className="my-0">
        <Outlet context={{ plant }} />
      </TabbedContent>
    </div>
  );
}
