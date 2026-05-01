import type { InspectionKpis } from "@/pages/dashboard/inspections/inspection-service";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { PAGES } from "@/endpoints";
import { ClipboardCheck, CheckCircle, CircleDot, XCircle } from "lucide-react";

interface InspectionStatCardsProps {
  kpis: InspectionKpis;
}

export function InspectionStatCards({ kpis }: InspectionStatCardsProps) {
  const cards: KpiCardProps[] = [
    {
      label: "Total inspections",
      value: kpis.totalInspections,
      icon: ClipboardCheck,
      className: "border-border bg-muted/10 hover:bg-muted/20",
      href: PAGES.DASHBOARD_INSPECTIONS,
    },
    {
      label: "In-review inbound",
      value: kpis.inboundInReview,
      icon: CircleDot,
      className:
        "border-amber-200 bg-amber-50/25 hover:bg-amber-50/40 dark:bg-amber-900/15",
      href: PAGES.DASHBOARD_INSPECTIONS_INBOUND_IN_REVIEW,
    },
    {
      label: "Rejected inbound",
      value: kpis.inboundRejected,
      icon: XCircle,
      className:
        "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
      href: PAGES.DASHBOARD_INSPECTIONS_INBOUND_REJECTED,
    },
    {
      label: "Approved inbound",
      value: kpis.inboundApproved,
      icon: CheckCircle,
      className:
        "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
      href: PAGES.DASHBOARD_INSPECTIONS_INBOUND_APPROVED,
    },
    {
      label: "In-review outbound",
      value: kpis.outboundInReview,
      icon: CircleDot,
      className:
        "border-amber-200 bg-amber-50/25 hover:bg-amber-50/40 dark:bg-amber-900/15",
      href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND_IN_REVIEW,
    },
    {
      label: "Rejected outbound",
      value: kpis.outboundRejected,
      icon: XCircle,
      className:
        "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
      href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND_REJECTED,
    },
    {
      label: "Approved outbound",
      value: kpis.outboundApproved,
      icon: CheckCircle,
      className:
        "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
      href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND_APPROVED,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <KpiCardGrid
        cards={cards}
        className="grid-cols-2 min-[520px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 min-w-[1040px] xl:min-w-0"
      />
    </div>
  );
}
