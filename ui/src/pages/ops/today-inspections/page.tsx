import { ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { InspectionReviewStatus } from "@/api/generated/model/inspectionReviewStatus";
import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { opsListEmptySectionClassName } from "@/components/ops/ops-list-section-classes";
import { OpsListHint } from "@/components/ops/ops-list-hint";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import { cn } from "@/lib/utils";
import type { InspectionType } from "@/pages/dashboard/inspections/inspection-types";
import {
  getInspections,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";

type TodayInspection = {
  id: string;
  productMaterialCode: string;
  inspectionType: InspectionType;
  lineDescription: string;
  inspectorName: string;
  checklistOutcome: "pass" | "fail";
  reviewStatus: string;
  loggedAtShort: string;
};

function buildLineDescription(inspection: Inspection): string {
  const parts: string[] = [];
  parts.push(
    inspection.inspection_type === "outbound"
      ? "Outbound inspection"
      : "Inbound inspection",
  );
  const wh = inspection.warehouse_code?.trim();
  if (wh) parts.push(`Warehouse ${wh}`);
  const plant = inspection.plant_code?.trim();
  if (plant) parts.push(`Plant ${plant}`);
  return parts.join(" · ");
}

function formatReviewLabel(status: string): string {
  const s = status.trim().toUpperCase();
  switch (s) {
    case InspectionReviewStatus.IN_REVIEW:
      return "In review";
    case InspectionReviewStatus.PENDING:
      return "Pending";
    case InspectionReviewStatus.APPROVED:
      return "Approved";
    case InspectionReviewStatus.REJECTED:
      return "Rejected";
    default:
      if (!s) return "";
      return s
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

function reviewBadgeClassName(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === InspectionReviewStatus.APPROVED) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100";
  }
  if (s === InspectionReviewStatus.REJECTED) {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  if (
    s === InspectionReviewStatus.IN_REVIEW ||
    s === InspectionReviewStatus.PENDING
  ) {
    return "border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100";
  }
  return "border-border/60 bg-muted/40 text-foreground";
}

function toTodayInspection(inspection: Inspection): TodayInspection {
  const cq = inspection.checklist_quality ?? "pass";
  return {
    id: inspection.id,
    productMaterialCode: inspection.product_serial,
    inspectionType: inspection.inspection_type,
    lineDescription: buildLineDescription(inspection),
    inspectorName: inspection.inspector_name,
    checklistOutcome: cq === "fail" ? "fail" : "pass",
    reviewStatus: inspection.review_status ?? "",
    loggedAtShort: new Date(inspection.created_at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export default function OpsTodayInspectionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TodayInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getInspections()
      .then((list) => {
        if (!cancelled) setRows(list.map(toTodayInspection));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const empty = !loading && rows.length === 0;

  return (
    <div className="space-y-4">
      <OpsListHint show={!loading && rows.length > 0}>
        Tap an inspection for full details, images, and review status.
      </OpsListHint>

      <section className={opsListEmptySectionClassName(loading, empty)}>
        {loading ? <OpsInspectionSkeleton variant="list" count={4} /> : null}
        {empty ? (
          <OpsListEmptyState
            title="No inspections yet"
            description="Completed checks will appear here so you can open details in one tap."
          />
        ) : null}
        {rows.map((inspection) => (
          <button
            key={inspection.id}
            type="button"
            aria-label={`Open inspection ${inspection.productMaterialCode}`}
            onClick={() =>
              navigate(PAGES.opsInspectionDetailPath(inspection.id))
            }
            className={cn(
              "flex w-full rounded-3xl border border-border/70 bg-card/90 p-4 text-left shadow-sm transition-all",
              "hover:border-primary/20 hover:bg-accent/40 active:scale-[0.995]",
            )}
          >
            <div className="flex w-full gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/40",
                  inspection.inspectionType === "inbound"
                    ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                    : "bg-amber-500/12 text-amber-900 dark:text-amber-200",
                )}
                aria-hidden
              >
                {inspection.inspectionType === "inbound" ? (
                  <ArrowDownToLine className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <ArrowUpFromLine className="h-5 w-5" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Material code
                    </p>
                    <p className="break-all font-mono text-sm font-semibold leading-snug text-foreground">
                      {inspection.productMaterialCode}
                    </p>
                    <p className="text-balance text-xs leading-relaxed text-muted-foreground">
                      {inspection.lineDescription}
                    </p>
                  </div>
                  <ChevronRight
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-medium",
                      inspection.checklistOutcome === "pass"
                        ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                        : "border-rose-500/45 bg-rose-500/10 text-rose-900 dark:text-rose-100",
                    )}
                  >
                    {inspection.checklistOutcome === "pass"
                      ? "Checklist passed"
                      : "Checklist failed"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-medium",
                      reviewBadgeClassName(inspection.reviewStatus),
                    )}
                  >
                    {formatReviewLabel(inspection.reviewStatus) || "Status —"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/85">
                    {inspection.loggedAtShort}
                  </span>
                  <span className="mx-1.5 text-muted-foreground/70">·</span>
                  <span>{inspection.inspectorName}</span>
                </p>
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
