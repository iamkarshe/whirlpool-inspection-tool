import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import { PAGES } from "@/endpoints";
import {
  Building2,
  ClipboardCheck,
  MapPin,
  MapPinned,
  Smartphone,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const linkBadgeClass = `${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`;

export function WarehouseCodeBadge({ code }: { code: string }) {
  return (
    <Badge variant="secondary" className={BADGE_ICON_CLASS}>
      <Building2 />
      {code.toUpperCase()}
    </Badge>
  );
}

export function WarehouseCityBadge({
  city,
  maxWidth = true,
}: {
  city: string;
  maxWidth?: boolean;
}) {
  const trimmed = city.trim();
  if (!trimmed) return null;
  return (
    <Badge
      variant="outline"
      className={`${BADGE_ICON_CLASS} ${maxWidth ? "max-w-[200px] truncate" : ""}`}
    >
      <MapPinned />
      <span className="uppercase">{trimmed}</span>
    </Badge>
  );
}

export function WarehouseAddressBadge({
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

export function WarehouseIdLinkBadge({ id }: { id: string }) {
  return (
    <Link to={PAGES.warehouseViewPath(id)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <Building2 />
        <span className="uppercase">{id}</span>
      </Badge>
    </Link>
  );
}

export function WarehouseUsersCountBadge({
  warehouseId,
  count,
}: {
  warehouseId: string;
  count: number;
}) {
  return (
    <Link to={PAGES.warehouseUsersPath(warehouseId)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <Users />
        {count}
      </Badge>
    </Link>
  );
}

export function WarehouseDevicesCountBadge({
  warehouseId,
  count,
}: {
  warehouseId: string;
  count: number;
}) {
  return (
    <Link to={PAGES.warehouseDevicesPath(warehouseId)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <Smartphone />
        {count}
      </Badge>
    </Link>
  );
}

export function WarehouseInspectionsCountBadge({
  warehouseId,
  count,
}: {
  warehouseId: string;
  count: number;
}) {
  return (
    <Link
      to={PAGES.warehouseInspectionsPath(warehouseId)}
      className="inline-block"
    >
      <Badge variant="secondary" className={linkBadgeClass}>
        <ClipboardCheck />
        {count}
      </Badge>
    </Link>
  );
}

export function WarehouseHeaderBadges({
  warehouse,
}: {
  warehouse: WarehouseResponse;
}) {
  return (
    <>
      <WarehouseCodeBadge code={warehouse.warehouse_code} />
      <WarehouseCityBadge city={warehouse.city} />
      <WarehouseAddressBadge address={warehouse.address} />
    </>
  );
}
