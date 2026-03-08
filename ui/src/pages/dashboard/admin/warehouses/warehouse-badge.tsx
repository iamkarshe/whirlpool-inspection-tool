import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import type { Warehouse } from "@/pages/dashboard/admin/warehouses/warehouse-service";
import {
  Building2,
  ClipboardCheck,
  MapPin,
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
    <Link to={PAGES.warehouseInspectionsPath(warehouseId)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <ClipboardCheck />
        {count}
      </Badge>
    </Link>
  );
}

export function WarehouseHeaderBadges({ warehouse }: { warehouse: Warehouse }) {
  return (
    <>
      <WarehouseCodeBadge code={warehouse.warehouse_code} />
      <WarehouseAddressBadge address={warehouse.address} />
    </>
  );
}
