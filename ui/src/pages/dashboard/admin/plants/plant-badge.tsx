import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import type { Plant } from "@/pages/dashboard/admin/plants/plant-service";
import {
  Building2,
  ClipboardCheck,
  MapPin,
  Smartphone,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const linkBadgeClass = `${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`;

export function PlantCodeBadge({ code }: { code: string }) {
  return (
    <Badge variant="secondary" className={BADGE_ICON_CLASS}>
      <Building2 />
      {code.toUpperCase()}
    </Badge>
  );
}

export function PlantAddressBadge({
  address,
  maxWidth = true,
}: {
  address: string;
  maxWidth?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={`${BADGE_ICON_CLASS} ${maxWidth ? "max-w-[280px] truncate" : ""}`}
    >
      <MapPin />
      <span className="uppercase">{address}</span>
    </Badge>
  );
}

export function PlantIdLinkBadge({ id }: { id: string }) {
  return (
    <Link to={PAGES.plantViewPath(id)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <Building2 />
        <span className="uppercase">{id}</span>
      </Badge>
    </Link>
  );
}

export function PlantUsersCountBadge({
  plantId,
  count,
}: {
  plantId: string;
  count: number;
}) {
  return (
    <Link to={PAGES.plantUsersPath(plantId)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <Users />
        {count}
      </Badge>
    </Link>
  );
}

export function PlantDevicesCountBadge({
  plantId,
  count,
}: {
  plantId: string;
  count: number;
}) {
  return (
    <Link to={PAGES.plantDevicesPath(plantId)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <Smartphone />
        {count}
      </Badge>
    </Link>
  );
}

export function PlantInspectionsCountBadge({
  plantId,
  count,
}: {
  plantId: string;
  count: number;
}) {
  return (
    <Link to={PAGES.plantInspectionsPath(plantId)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <ClipboardCheck />
        {count}
      </Badge>
    </Link>
  );
}

export function PlantHeaderBadges({ plant }: { plant: Plant }) {
  return (
    <>
      <PlantCodeBadge code={plant.plant_code} />
      <PlantAddressBadge address={plant.address} />
    </>
  );
}
