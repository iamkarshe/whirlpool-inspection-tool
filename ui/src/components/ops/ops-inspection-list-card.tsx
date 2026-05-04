import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

import { InspectionReviewStatus } from "@/api/generated/model/inspectionReviewStatus";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InspectionTypeBadge } from "@/pages/dashboard/inspections/inspection-badge";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";
import type {
  InspectionChecklistLayerCounts,
  InspectionType,
} from "@/pages/dashboard/inspections/inspection-types";

export type OpsInspectionListCardMode =
  | "today"
  | "ops-inspection-list"
  | "manager-review-queue";

export type OpsInspectionListCardProps = {
  inspection: Inspection;
  mode: OpsInspectionListCardMode;
  onOpen: () => void;
};

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

function toListTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loggedAtShort(createdAt: string) {
  return new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChecklistLayerCountBadges({
  layers,
  className,
}: {
  layers: NonNullable<Inspection["checklist_layers"]>;
  className?: string;
}) {
  const items: {
    key: string;
    label: string;
    counts: InspectionChecklistLayerCounts;
  }[] = [
    { key: "outer", label: "Outer", counts: layers.outer },
    { key: "inner", label: "Inner", counts: layers.inner },
    { key: "product", label: "Product", counts: layers.product },
  ];

  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      aria-label="Checklist pass and fail counts by layer: outer, inner, product"
    >
      {items.map(({ key, label, counts }) => {
        const pass = counts.pass_count ?? 0;
        const fail = counts.fail_count ?? 0;
        return (
          <Badge
            key={key}
            variant="outline"
            title={`${label}: ${pass} passed, ${fail} failed`}
            className={cn(
              "gap-1 tabular-nums text-[10px] font-semibold",
              fail > 0
                ? "border-rose-500/45 bg-rose-500/10 text-rose-900 dark:text-rose-100"
                : "border-border/60 bg-muted/30 text-foreground",
            )}
          >
            <span className="font-medium text-muted-foreground">{label}</span>
            <span className="font-mono">
              <span className="text-emerald-700 dark:text-emerald-300">{pass}</span>
              <span className="text-muted-foreground/70">/</span>
              <span
                className={
                  fail > 0
                    ? "text-rose-700 dark:text-rose-200"
                    : "text-muted-foreground"
                }
              >
                {fail}
              </span>
            </span>
          </Badge>
        );
      })}
    </div>
  );
}

function ChecklistOutcomePill({ inspection }: { inspection: Inspection }) {
  const q = inspection.checklist_quality;
  if (q === "fail") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-300">
        Checklist fail
      </span>
    );
  }
  if (q === "pass") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
        Checklist pass
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      —
    </span>
  );
}

export function OpsInspectionListCard({
  inspection,
  mode,
  onOpen,
}: OpsInspectionListCardProps) {
  const serial = inspection.product_serial;
  const reviewStatus = inspection.review_status ?? "";
  const reviewLabel = formatReviewLabel(reviewStatus) || reviewStatus.trim();

  if (mode === "today") {
    const cq = inspection.checklist_quality ?? "pass";
    const outcome: "pass" | "fail" = cq === "fail" ? "fail" : "pass";
    const wh = inspection.warehouse_code?.trim();
    const plant = inspection.plant_code?.trim();
    const direction = inspection.inspection_type as InspectionType;

    return (
      <button
        type="button"
        aria-label={`Open inspection ${serial}`}
        onClick={onOpen}
        className={cn(
          "flex w-full rounded-3xl border border-border/70 bg-card/90 p-4 text-left shadow-sm transition-all",
          "hover:border-primary/20 hover:bg-accent/40 active:scale-[0.995]",
        )}
      >
        <div className="flex w-full gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/40",
              direction === "inbound"
                ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                : "bg-amber-500/12 text-amber-900 dark:text-amber-200",
            )}
            aria-hidden
          >
            {direction === "inbound" ? (
              <ArrowDownToLine className="h-5 w-5" strokeWidth={2} />
            ) : (
              <ArrowUpFromLine className="h-5 w-5" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {serial}
                </p>
                <p className="break-all font-mono text-sm font-semibold leading-snug text-foreground">
                  {serial}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <InspectionTypeBadge
                    inspectionType={direction}
                    className="text-[10px]"
                  />
                  {wh ? (
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium"
                    >
                      Warehouse {wh}
                    </Badge>
                  ) : null}
                  {plant ? (
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium"
                    >
                      Plant {plant}
                    </Badge>
                  ) : null}
                </div>
                {inspection.checklist_layers ? (
                  <ChecklistLayerCountBadges
                    layers={inspection.checklist_layers}
                    className="pt-0.5"
                  />
                ) : null}
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
                  outcome === "pass"
                    ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                    : "border-rose-500/45 bg-rose-500/10 text-rose-900 dark:text-rose-100",
                )}
              >
                {outcome === "pass" ? "Checklist passed" : "Checklist failed"}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] font-medium",
                  reviewBadgeClassName(reviewStatus),
                )}
              >
                {formatReviewLabel(reviewStatus) || "Status —"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/85">
                {loggedAtShort(inspection.created_at)}
              </span>
              <span className="mx-1.5 text-muted-foreground/70">·</span>
              <span>{inspection.inspector_name}</span>
            </p>
          </div>
        </div>
      </button>
    );
  }

  const isManagerQueue = mode === "manager-review-queue";
  const leadClass = isManagerQueue
    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300";

  return (
    <button
      type="button"
      aria-label={`Open inspection ${serial}`}
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded-3xl border bg-card/80 p-3 text-left shadow-sm transition-colors hover:bg-accent"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={leadClass} aria-hidden>
          <ClipboardList className="h-5 w-5" />
        </div>
        <div
          className={cn("min-w-0", isManagerQueue ? "space-y-0.5" : "space-y-1")}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <InspectionTypeBadge inspectionType={inspection.inspection_type} />
            {isManagerQueue ? (
              <Badge variant="outline" className="text-[10px]">
                Needs review
              </Badge>
            ) : reviewLabel ? (
              <Badge
                variant="outline"
                className={cn(
                  "max-w-[140px] truncate text-[10px] font-medium",
                  reviewBadgeClassName(reviewStatus),
                )}
              >
                {reviewLabel}
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-sm font-semibold font-mono">{serial}</p>
          <p className="text-[11px] text-muted-foreground">
            {inspection.inspector_name} · {toListTime(inspection.created_at)}
          </p>
          {inspection.checklist_layers ? (
            <ChecklistLayerCountBadges layers={inspection.checklist_layers} />
          ) : null}
        </div>
      </div>
      {mode === "ops-inspection-list" ? (
        <div className="flex shrink-0 flex-col items-end gap-2">
          <ChecklistOutcomePill inspection={inspection} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </button>
  );
}
