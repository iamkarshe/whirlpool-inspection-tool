import type { InspectionKpis } from "@/pages/dashboard/inspections/inspection-service";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { PAGES } from "@/endpoints";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface InspectionStatCardsProps {
  kpis: InspectionKpis;
}

export function InspectionStatCards({ kpis }: InspectionStatCardsProps) {
  const cards: KpiCardProps[] = [
    {
      label: "Total Inspections",
      value: kpis.totalInspections,
      icon: ClipboardCheck,
      className: "border-border bg-muted/10 hover:bg-muted/20",
      href: PAGES.DASHBOARD_INSPECTIONS,
    },
    {
      label: "Inbound Passed",
      value: kpis.inboundPassed,
      icon: ArrowDownToLine,
      className:
        "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
      href: PAGES.DASHBOARD_INSPECTIONS_INBOUND,
    },
    {
      label: "Inbound Failed",
      value: kpis.inboundFailed,
      icon: ArrowDownToLine,
      className:
        "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
      href: PAGES.DASHBOARD_INSPECTIONS_INBOUND_FAILED,
    },
    {
      label: "Outbound Passed",
      value: kpis.outboundPassed,
      icon: ArrowUpFromLine,
      className:
        "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
      href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND,
    },
    {
      label: "Outbound Failed",
      value: kpis.outboundFailed,
      icon: ArrowUpFromLine,
      className:
        "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
      href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND_FAILED,
    },
  ];

  // Add small semantic icon cue in labels via existing icon slot.
  // (KpiCard supports only one icon; keep it subtle and consistent.)
  cards[1].icon = CheckCircle;
  cards[2].icon = XCircle;
  cards[3].icon = CheckCircle;
  cards[4].icon = XCircle;

  return (
    <div className="overflow-x-auto">
      <KpiCardGrid
        cards={cards}
        className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 min-w-[980px]"
      />
    </div>
  );
}
