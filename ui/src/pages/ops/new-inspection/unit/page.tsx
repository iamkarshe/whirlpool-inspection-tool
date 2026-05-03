import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Import, Loader2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import type { BarcodeParseResponse } from "@/api/generated/model/barcodeParseResponse";
import type { InspectionWithChecklistPayload } from "@/api/generated/model/inspectionWithChecklistPayload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PAGES } from "@/endpoints";
import {
  formatReviewStatusLabel,
  readInspectionReviewStatus,
  reviewStatusBadgeClass,
} from "@/pages/ops/new-inspection/inspection-status-display";
import { OPS_BARCODE_LEN } from "@/pages/ops/new-inspection/constants";
import {
  opsInspectionApiError,
  parseInspectionBarcode,
} from "@/services/ops-inspections-api";

function summarizeInspection(ins: InspectionWithChecklistPayload): string {
  const pass = ins.checklist_pass_total ?? 0;
  const fail = ins.checklist_fail_total ?? 0;
  return `${pass} pass · ${fail} fail`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OpsNewInspectionUnitPage() {
  const params = useParams<{ barcode: string }>();
  const rawParam = params.barcode ?? "";
  const barcode = decodeURIComponent(rawParam)
    .replace(/\s+/g, "")
    .slice(0, OPS_BARCODE_LEN);

  if (barcode.length !== OPS_BARCODE_LEN) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          This link does not contain a valid {OPS_BARCODE_LEN}-character
          barcode.
        </p>
        <Button variant="outline" asChild>
          <Link to={PAGES.OPS_NEW_INSPECTION}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to scan
          </Link>
        </Button>
      </div>
    );
  }

  return <UnitDetails key={barcode} barcode={barcode} />;
}

function UnitDetails({ barcode }: { barcode: string }) {
  const navigate = useNavigate();
  const [parsed, setParsed] = useState<BarcodeParseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    parseInspectionBarcode(barcode)
      .then((res) => {
        if (!cancelled) {
          setParsed(res);
          setLoadError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setParsed(null);
          setLoadError(
            opsInspectionApiError(e, "Could not read this barcode."),
          );
          toast.error(opsInspectionApiError(e, "Could not read this barcode."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [barcode]);

  const startInboundTo = `${PAGES.OPS_NEW_INSPECTION_INBOUND}?barcode=${encodeURIComponent(barcode)}`;
  const startOutboundTo = `${PAGES.OPS_NEW_INSPECTION_OUTBOUND}?barcode=${encodeURIComponent(barcode)}`;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading product…</p>
      </div>
    );
  }

  if (loadError || !parsed) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm">
          {loadError ?? "Unknown error."}
        </p>
        <Button variant="outline" asChild>
          <Link to={PAGES.OPS_NEW_INSPECTION}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Try another barcode
          </Link>
        </Button>
      </div>
    );
  }

  const inbound = parsed.inbound_inspection ?? null;
  const outbound = parsed.outbound_inspection ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New inspection
          </p>
          <p className="font-mono text-sm text-muted-foreground">{barcode}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(PAGES.OPS_NEW_INSPECTION)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to scan
        </Button>
      </div>

      <Card className="border bg-card/80 py-0 shadow-sm ring-1 ring-border/40">
        <div className="space-y-1 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Product
          </p>
          <p className="text-sm font-medium leading-tight text-foreground">
            {parsed.product.material_description}
          </p>
        </div>
        <div className="space-y-0.5 border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <span className="shrink-0 font-medium text-foreground">
              Category
            </span>
            <span>{parsed.product_category.name}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <span className="shrink-0 font-medium text-foreground">
              Material
            </span>
            <span>{parsed.product.material_code}</span>
          </div>
          {parsed.product_unit?.barcode ? (
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <span className="shrink-0 font-medium text-foreground">Unit</span>
              <span className="font-mono">{parsed.product_unit.barcode}</span>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        <FlowColumnCard
          variant="inbound"
          title="Inbound"
          description="Receiving · inward QC"
          icon={Import}
          inspection={inbound}
          startHref={startInboundTo}
        />
        <FlowColumnCard
          variant="outbound"
          title="Outbound"
          description="Dispatch · outward QC"
          icon={Truck}
          inspection={outbound}
          startHref={startOutboundTo}
        />
      </div>

      {inbound && outbound ? (
        <p className="text-center text-sm text-muted-foreground">
          Inbound and outbound inspections already exist for this unit. Open one
          above or use Search.
        </p>
      ) : null}
    </div>
  );
}

type FlowColumnCardProps = {
  variant: "inbound" | "outbound";
  title: string;
  description: string;
  icon: LucideIcon;
  inspection: InspectionWithChecklistPayload | null;
  startHref: string;
};

function FlowColumnCard({
  variant,
  title,
  description,
  icon: Icon,
  inspection,
  startHref,
}: FlowColumnCardProps) {
  const recorded = inspection !== null;
  const reviewStatus = inspection
    ? readInspectionReviewStatus(inspection)
    : null;

  const accent =
    variant === "inbound"
      ? "border-l-[3px] border-l-sky-500/65 bg-sky-500/[0.04] dark:border-l-sky-400/45 dark:bg-sky-950/25"
      : "border-l-[3px] border-l-amber-500/65 bg-amber-500/[0.04] dark:border-l-amber-400/45 dark:bg-amber-950/20";

  const iconTint =
    variant === "inbound"
      ? "text-sky-700/80 dark:text-sky-300/90"
      : "text-amber-800/80 dark:text-amber-300/90";

  const openButtonClass =
    variant === "inbound"
      ? cn(
          "border-sky-500/40 bg-sky-500/15 text-sky-950 shadow-none hover:bg-sky-500/25 hover:text-sky-950",
          "dark:border-sky-500/30 dark:bg-sky-950/45 dark:text-sky-50 dark:hover:bg-sky-900/55 dark:hover:text-sky-50",
        )
      : cn(
          "border-amber-500/40 bg-amber-500/15 text-amber-950 shadow-none hover:bg-amber-500/25 hover:text-amber-950",
          "dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-900/50 dark:hover:text-amber-50",
        );

  const titleColor =
    variant === "inbound"
      ? "text-sky-950 dark:text-sky-50"
      : "text-amber-950 dark:text-amber-50";

  const notStartedBadgeClass =
    variant === "inbound"
      ? cn(
          "border-sky-400/45 bg-sky-500/[0.12] text-sky-950 shadow-sm ring-1 ring-sky-500/15",
          "dark:border-sky-500/35 dark:bg-sky-950/55 dark:text-sky-100 dark:ring-sky-400/10",
        )
      : cn(
          "border-amber-400/45 bg-amber-500/[0.12] text-amber-950 shadow-sm ring-1 ring-amber-500/15",
          "dark:border-amber-500/35 dark:bg-amber-950/50 dark:text-amber-50 dark:ring-amber-400/10",
        );

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border/50 bg-muted/5 pl-2.5 shadow-none",
        accent,
      )}
    >
      <div className="flex flex-1 flex-col gap-1.5 px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex items-start gap-2">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                variant === "inbound"
                  ? "border-sky-500/25 bg-sky-500/15 dark:border-sky-500/20 dark:bg-sky-950/40"
                  : "border-amber-500/25 bg-amber-500/15 dark:border-amber-500/20 dark:bg-amber-950/35",
              )}
              aria-hidden
            >
              <Icon className={cn("h-5 w-5", iconTint)} strokeWidth={2.25} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p
                className={cn(
                  "text-lg font-bold leading-none tracking-tight sm:text-xl",
                  titleColor,
                )}
              >
                {title}
              </p>
              <p className="text-xs font-medium leading-snug text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          {recorded && reviewStatus ? (
            <Badge
              variant="outline"
              className={cn(
                "h-5 shrink-0 border px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide",
                reviewStatusBadgeClass(reviewStatus),
              )}
            >
              {formatReviewStatusLabel(reviewStatus)}
            </Badge>
          ) : recorded ? (
            <Badge
              variant="outline"
              className="h-5 shrink-0 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Submitted
            </Badge>
          ) : (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                notStartedBadgeClass,
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full ring-2 ring-background/80",
                  variant === "inbound"
                    ? "bg-sky-500 shadow-[0_0_0_1px_rgba(14,165,233,0.35)] dark:bg-sky-400"
                    : "bg-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.35)] dark:bg-amber-400",
                )}
                aria-hidden
              />
              Not started
            </span>
          )}
        </div>

        {recorded && inspection ? (
          <div className="space-y-0.5 border-t border-border/40 pt-1.5">
            <p className="tabular-nums text-[11px] leading-tight text-foreground/90">
              {summarizeInspection(inspection)}
            </p>
            <p className="text-[10px] leading-tight text-muted-foreground">
              {formatWhen(inspection.created_at)}
            </p>
            {inspection.warehouse_code ? (
              <p className="font-mono text-[10px] leading-tight text-muted-foreground/90">
                {inspection.warehouse_code}
                {inspection.plant_code ? ` · ${inspection.plant_code}` : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="hidden border-t border-border/40 pt-1.5 text-[11px] leading-snug text-muted-foreground">
            No {title.toLowerCase()} record for this unit.
          </p>
        )}

        <div className="pt-0">
          {recorded && inspection ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className={cn("h-8 w-full text-xs font-medium", openButtonClass)}
            >
              <Link to={PAGES.opsInspectionDetailPath(inspection.uuid)}>
                Open Details
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              className="h-8 w-full text-xs font-medium"
            >
              <Link to={startHref}>Start Inspection</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
