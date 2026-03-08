import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import type {
  Inspection,
  InspectionType,
} from "@/pages/dashboard/transactions/inspections/inspection-service";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  ListChecks,
  Package,
} from "lucide-react";
import { Link } from "react-router-dom";

type BadgeVariant = "default" | "secondary" | "outline";

const inspectionTypeVariant: Record<InspectionType, BadgeVariant> = {
  inbound: "secondary",
  outbound: "default",
};

const inspectionTypeIcon: Record<
  InspectionType,
  React.ComponentType<{ className?: string }>
> = {
  inbound: ArrowDownToLine,
  outbound: ArrowUpFromLine,
};

export function InspectionTypeBadge({
  inspectionType,
  className,
}: {
  inspectionType: InspectionType;
  className?: string;
}) {
  const variant = inspectionTypeVariant[inspectionType];
  const Icon = inspectionTypeIcon[inspectionType];
  return (
    <Badge
      variant={variant}
      className={`${BADGE_ICON_CLASS} ${className ?? ""}`}
    >
      <Icon />
      {inspectionType}
    </Badge>
  );
}

const linkBadgeClass = `${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`;

export function InspectionIdLinkBadge({
  id,
  truncate = true,
}: {
  id: string;
  truncate?: boolean;
}) {
  const display = truncate ? `${String(id).slice(0, 8)}…` : id;
  return (
    <Link to={PAGES.inspectionViewPath(id)} className="inline-block">
      <Badge variant="secondary" className={linkBadgeClass}>
        <ClipboardCheck />
        <span className="uppercase">{display}</span>
      </Badge>
    </Link>
  );
}

export function InspectionChecklistBadge({ name }: { name: string }) {
  return (
    <Badge variant="secondary" className={BADGE_ICON_CLASS}>
      <ListChecks />
      <span className="uppercase">{name}</span>
    </Badge>
  );
}

export function InspectionProductBadge({ serial }: { serial: string }) {
  return (
    <Badge variant="outline" className={BADGE_ICON_CLASS}>
      <Package />
      <span className="uppercase">{serial}</span>
    </Badge>
  );
}

export function InspectionHeaderBadges({ inspection }: { inspection: Inspection }) {
  return (
    <>
      <InspectionTypeBadge inspectionType={inspection.inspection_type} />
      <InspectionProductBadge serial={inspection.product_serial} />
    </>
  );
}
