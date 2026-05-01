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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PAGES } from "@/endpoints";
import { OPS_BARCODE_LEN } from "@/pages/ops/new-inspection/constants";
import type { OpsInspectionSharedFormData } from "@/pages/ops/new-inspection/inspection-start-shared";
import { OpsInspectionStartForm } from "@/pages/ops/new-inspection/ops-inspection-start-form";
import {
  fetchActiveInspectionChecklist,
  fetchInspectionMetadataForOps,
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
  const [sharedFormData, setSharedFormData] = useState<OpsInspectionSharedFormData>(
    {
      metadata: null,
      checklistGroups: [],
      loading: true,
    },
  );
  const [tab, setTab] = useState<"inbound" | "outbound">("inbound");

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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchInspectionMetadataForOps(),
      fetchActiveInspectionChecklist(),
    ])
      .then(([meta, chk]) => {
        if (!cancelled) {
          setSharedFormData({
            metadata: meta,
            checklistGroups: chk.groups ?? [],
            loading: false,
          });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSharedFormData((prev) => ({ ...prev, loading: false }));
          toast.error(
            opsInspectionApiError(e, "Could not load inspection form data."),
          );
        }
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

      <Card className="border bg-card/80 py-0 shadow-sm">
        <div className="space-y-1 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Product
          </p>
          <p className="text-sm font-medium leading-tight text-foreground">
            {parsed.product.material_description}
          </p>
        </div>
        <div className="space-y-0.5 border-t px-3 py-2 text-xs text-muted-foreground">
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
          {parsed.product_unit?.barcode ?
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <span className="shrink-0 font-medium text-foreground">Unit</span>
              <span className="font-mono">{parsed.product_unit.barcode}</span>
            </div>
          : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FlowColumnCard
          title="Inbound"
          description="Receiving / inward quality check."
          icon={Import}
          inspection={inbound}
          startHref={startInboundTo}
          onStart={() => setTab("inbound")}
          accent="border-sky-500/25 bg-sky-500/[0.06] ring-1 ring-sky-500/15"
        />
        <FlowColumnCard
          title="Outbound"
          description="Dispatch / outward quality check."
          icon={Truck}
          inspection={outbound}
          startHref={startOutboundTo}
          onStart={() => setTab("outbound")}
          accent="border-amber-500/25 bg-amber-500/[0.06] ring-1 ring-amber-500/15"
        />
      </div>

      {inbound && outbound ?
        <p className="text-center text-sm text-muted-foreground">
          Inbound and outbound are both on file for this unit. Open a record
          above or use Search to find others.
        </p>
      : null}

      <section className="space-y-3">
        <p className="text-sm font-semibold text-foreground">
          Inspection input
        </p>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "inbound" | "outbound")}
          className="w-full"
        >
          <TabsList
            variant="default"
            className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:max-w-md"
          >
            <TabsTrigger value="inbound" className="">
              Inbound
            </TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
          </TabsList>
          <TabsContent value="inbound" className="mt-4 outline-none">
            <Card
              className={cn(
                "border bg-card shadow-sm py-0",
                "border-sky-500/30 bg-sky-500/[0.06] ring-1 ring-sky-500/15",
              )}
            >
              <div className="p-4 sm:p-5">
                {inbound ?
                  <InspectionAlreadyRecorded
                    title="Inbound"
                    inspection={inbound}
                  />
                : (
                  <OpsInspectionStartForm
                    mode="inbound"
                    barcode={barcode}
                    embedded
                    sharedData={sharedFormData}
                  />
                )}
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="outbound" className="mt-4 outline-none">
            <Card
              className={cn(
                "border bg-card shadow-sm py-0",
                "border-amber-500/30 bg-amber-500/[0.06] ring-1 ring-amber-500/15",
              )}
            >
              <div className="p-4 sm:p-5">
                {outbound ?
                  <InspectionAlreadyRecorded
                    title="Outbound"
                    inspection={outbound}
                  />
                : (
                  <OpsInspectionStartForm
                    mode="outbound"
                    barcode={barcode}
                    embedded
                    sharedData={sharedFormData}
                  />
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function InspectionAlreadyRecorded({
  title,
  inspection,
}: {
  title: string;
  inspection: InspectionWithChecklistPayload;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{title}: on file</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {formatWhen(inspection.created_at)} ·{" "}
        {summarizeInspection(inspection)}
      </p>
      {inspection.warehouse_code ?
        <p className="text-xs text-muted-foreground">
          Warehouse {inspection.warehouse_code}
          {inspection.plant_code ? ` · Plant ${inspection.plant_code}` : ""}
        </p>
      : null}
      <Button asChild className="w-full sm:w-auto">
        <Link to={PAGES.opsInspectionDetailPath(inspection.uuid)}>
          View inspection
        </Link>
      </Button>
    </div>
  );
}

type FlowColumnCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  inspection: InspectionWithChecklistPayload | null;
  /** Fallback deep link when not using embedded tabs. */
  startHref: string;
  /** Jump to inspection input tab on this page. */
  onStart: () => void;
  accent: string;
};

function FlowColumnCard({
  title,
  description,
  icon: Icon,
  inspection,
  startHref,
  onStart,
  accent,
}: FlowColumnCardProps) {
  const recorded = inspection !== null;

  return (
    <Card className={cn("flex flex-col ring-1", accent)}>
      <div className="space-y-3 p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-background/80 ring-1 ring-border">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-base font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant={recorded ? "secondary" : "outline"}>
            {recorded ? "On file" : "Not started"}
          </Badge>
        </div>
        <div className="flex-1 space-y-2 text-sm">
          {recorded && inspection ?
            <>
              <p className="text-muted-foreground">
                {formatWhen(inspection.created_at)} ·{" "}
                {summarizeInspection(inspection)}
              </p>
              {inspection.warehouse_code ?
                <p className="text-xs text-muted-foreground">
                  Warehouse {inspection.warehouse_code}
                  {inspection.plant_code
                    ? ` · Plant ${inspection.plant_code}`
                    : ""}
                </p>
              : null}
            </>
          : (
            <p className="text-muted-foreground">
              No {title.toLowerCase()} inspection exists for this unit yet.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-0 sm:flex-row sm:justify-end">
          {recorded && inspection ?
            <Button asChild className="w-full sm:w-auto">
              <Link to={PAGES.opsInspectionDetailPath(inspection.uuid)}>
                View details
              </Link>
            </Button>
          : (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={onStart}
              >
                Fill below
              </Button>
              <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
                <Link to={startHref}>Open full-page form</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
