import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlantCodeBadge } from "@/pages/dashboard/admin/plants/plant-badge";
import type { PlantViewContext } from "@/pages/dashboard/admin/plants/plant-view/context";
import { MapPin } from "lucide-react";
import { useOutletContext } from "react-router-dom";

export default function PlantViewDetailsPage() {
  const { plant } = useOutletContext<PlantViewContext>();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>{plant.name}</CardTitle>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <PlantCodeBadge code={plant.plant_code} />
              <Badge variant="outline" className="text-xs font-normal">
                ID {plant.id}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Code</p>
          <PlantCodeBadge code={plant.plant_code} />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Address</p>
          <p className="text-sm">{plant.address}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">City</p>
          <p className="text-sm">{plant.city}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Postal code</p>
          <p className="font-mono text-sm">{plant.postal_code}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Latitude</p>
          <p className="font-mono text-sm">
            {plant.lat != null ? plant.lat.toFixed(4) : "—"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Longitude</p>
          <p className="font-mono text-sm">
            {plant.lng != null ? plant.lng.toFixed(4) : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
