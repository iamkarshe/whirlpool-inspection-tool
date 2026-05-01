import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ChecklistAnswerEntry } from "@/api/generated/model/checklistAnswerEntry";
import type { ChecklistGroupBlock } from "@/api/generated/model/checklistGroupBlock";
import type { DamageGrading } from "@/api/generated/model/damageGrading";
import type { DamageLikelyCause } from "@/api/generated/model/damageLikelyCause";
import type { DamageSeverity } from "@/api/generated/model/damageSeverity";
import type { DamageType } from "@/api/generated/model/damageType";
import type { InspectionMetadataResponse } from "@/api/generated/model/inspectionMetadataResponse";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OPS_BARCODE_LEN } from "@/pages/ops/new-inspection/constants";
import {
  type InspectionStartMode,
  type OpsInspectionSharedFormData,
  toDatetimeLocalValue,
} from "@/pages/ops/new-inspection/inspection-start-shared";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getOrCreatePersistentDeviceId } from "@/lib/device-fingerprint";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PAGES } from "@/endpoints";
import { cn } from "@/lib/utils";
import {
  fetchActiveInspectionChecklist,
  fetchInspectionMetadataForOps,
  opsInspectionApiError,
  startOpsInboundInspection,
  startOpsOutboundInspection,
} from "@/services/ops-inspections-api";

export type OpsInspectionStartFormProps = {
  mode: InspectionStartMode;
  barcode: string;
  /** Hide page title/subtitle chrome (embedded in unit tabs). */
  embedded?: boolean;
  /** Wrapped section classes (theme border/bg on unit page). */
  className?: string;
  /** When set, skips internal checklist/metadata fetch (e.g. unit page loads once). */
  sharedData?: OpsInspectionSharedFormData;
  onNavigateBack?: () => void;
};

export function OpsInspectionStartForm({
  mode,
  barcode,
  embedded = false,
  className,
  sharedData,
  onNavigateBack,
}: OpsInspectionStartFormProps) {
  const navigate = useNavigate();
  const { acquireLocation } = useGeolocation();

  const [metadata, setMetadata] = useState<InspectionMetadataResponse | null>(
    null,
  );
  const [checklistGroups, setChecklistGroups] = useState<ChecklistGroupBlock[]>(
    [],
  );
  const [loadingLocal, setLoadingLocal] = useState(!sharedData);

  useEffect(() => {
    if (sharedData) return;
    let cancelled = false;
    setLoadingLocal(true);
    Promise.all([
      fetchInspectionMetadataForOps(),
      fetchActiveInspectionChecklist(),
    ])
      .then(([meta, chk]) => {
        if (!cancelled) {
          setMetadata(meta);
          setChecklistGroups(chk.groups ?? []);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          toast.error(
            opsInspectionApiError(e, "Could not load inspection form data."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLocal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sharedData]);

  const checklistGroupsEffective = sharedData?.checklistGroups ?? checklistGroups;
  const metadataEffective = sharedData?.metadata ?? metadata;

  const [warehouseCode, setWarehouseCode] = useState("");
  const [plantCode, setPlantCode] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [dockNumber, setDockNumber] = useState("");
  const [truckDockingLocal, setTruckDockingLocal] = useState(() =>
    toDatetimeLocalValue(),
  );

  const [damageType, setDamageType] = useState("");
  const [damageSeverity, setDamageSeverity] = useState("");
  const [damageCause, setDamageCause] = useState("");
  const [damageGrade, setDamageGrade] = useState("");

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});

  const [submitting, setSubmitting] = useState(false);

  const orderedItems = useMemo(
    () =>
      checklistGroupsEffective
        .flatMap((g) => g.items)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [checklistGroupsEffective],
  );

  const setAnswer = (id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const setRemark = (id: number, value: string) => {
    setRemarksMap((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (barcode.length !== OPS_BARCODE_LEN) return;
    if (!warehouseCode.trim()) {
      toast.error("Choose a warehouse.");
      return;
    }
    if (mode === "inbound" && !plantCode.trim()) {
      toast.error("Choose a supplier plant.");
      return;
    }
    if (!truckNumber.trim()) {
      toast.error("Truck number is required.");
      return;
    }

    for (const item of orderedItems) {
      const v = (answers[item.id] ?? "").trim();
      if (!v) {
        toast.error(`Answer all checklist questions (${item.section}).`);
        return;
      }
    }

    const coords = await acquireLocation();
    if (!coords) {
      toast.error("Allow location access to start an inspection.");
      return;
    }

    const dockingIso = new Date(truckDockingLocal).toISOString();
    const deviceUuid = getOrCreatePersistentDeviceId();

    const checklist_answers: ChecklistAnswerEntry[] = orderedItems.map(
      (item) => ({
        id: item.id,
        value: answers[item.id]!.trim(),
        remarks: remarksMap[item.id]?.trim() || undefined,
      }),
    );

    const damageFilled =
      damageType.trim().length > 0 &&
      damageSeverity.trim().length > 0 &&
      damageCause.trim().length > 0 &&
      damageGrade.trim().length > 0;

    const damageBlock =
      damageFilled ?
        ({
          damage_type: damageType.trim() as DamageType,
          damage_severity: damageSeverity.trim() as DamageSeverity,
          damage_cause: damageCause.trim() as DamageLikelyCause,
          damage_grade: damageGrade.trim() as DamageGrading,
        })
      : {};

    setSubmitting(true);
    try {
      if (mode === "inbound") {
        const res = await startOpsInboundInspection({
          barcode,
          device_uuid: deviceUuid,
          warehouse_code: warehouseCode.trim(),
          supplier_plant_code: plantCode.trim(),
          lat: coords.lat,
          lng: coords.lng,
          truck_number: truckNumber.trim(),
          dock_number: dockNumber.trim() || null,
          truck_docking_time: dockingIso,
          checklist_answers,
          ...damageBlock,
        });
        toast.success("Inbound inspection started.");
        navigate(PAGES.opsInspectionDetailPath(res.uuid), { replace: true });
      } else {
        const res = await startOpsOutboundInspection({
          barcode,
          device_uuid: deviceUuid,
          warehouse_code: warehouseCode.trim(),
          supplier_plant_code: plantCode.trim() || null,
          lat: coords.lat,
          lng: coords.lng,
          truck_number: truckNumber.trim(),
          dock_number: dockNumber.trim() || null,
          truck_docking_time: dockingIso,
          checklist_answers,
          ...damageBlock,
        });
        toast.success("Outbound inspection started.");
        navigate(PAGES.opsInspectionDetailPath(res.uuid), { replace: true });
      }
    } catch (e: unknown) {
      toast.error(
        opsInspectionApiError(
          e,
          mode === "inbound"
            ? "Could not start inbound inspection."
            : "Could not start outbound inspection.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loadingData = sharedData?.loading ?? loadingLocal;

  if (loadingData) {
    return (
      <div className="flex min-h-[32vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading form…</p>
      </div>
    );
  }

  const titleLabel =
    mode === "inbound" ? "New inbound inspection" : "New outbound inspection";

  const plantSelectValue =
    mode === "outbound" && !plantCode.trim() ? "__none_out__" : plantCode;

  const rootCls = cn("space-y-6", className);

  return (
    <div className={rootCls}>
      {!embedded ?
        (
          <header className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {mode === "inbound" ? "Inbound" : "Outbound"}
            </p>
            <h2 className="text-xl font-semibold tracking-tight">{titleLabel}</h2>
            <p className="font-mono text-sm text-muted-foreground">{barcode}</p>
          </header>
        )
      : (
        <p className="text-sm font-semibold">
          {mode === "inbound" ? "Inbound" : "Outbound"} input
        </p>
      )}

      <section className="space-y-3 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <p className="text-sm font-semibold">Shipment &amp; site</p>
        <div className="space-y-2">
          <Label htmlFor={`warehouse-${mode}`}>Warehouse</Label>
          <Select
            value={warehouseCode}
            onValueChange={setWarehouseCode}
            disabled={!metadataEffective?.warehouses?.length}
          >
            <SelectTrigger id={`warehouse-${mode}`} className="w-full">
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {(metadataEffective?.warehouses ?? []).map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`plant-${mode}`}>
            {mode === "inbound" ? "Supplier plant" : "Plant (optional)"}
          </Label>
          <Select
            value={plantSelectValue}
            onValueChange={(v) =>
              setPlantCode(v === "__none_out__" ? "" : v)
            }
            disabled={!metadataEffective?.plants?.length}
          >
            <SelectTrigger id={`plant-${mode}`} className="w-full">
              <SelectValue placeholder="Select plant" />
            </SelectTrigger>
            <SelectContent>
              {mode === "outbound" ?
                <SelectItem value="__none_out__">NA</SelectItem>
              : null}
              {(metadataEffective?.plants ?? []).map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`truck-${mode}`}>Truck number</Label>
            <Input
              id={`truck-${mode}`}
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              placeholder="Vehicle number"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`dock-${mode}`}>Dock (optional)</Label>
            <Input
              id={`dock-${mode}`}
              value={dockNumber}
              onChange={(e) => setDockNumber(e.target.value)}
              placeholder="Dock / gate"
              className="w-full"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`docktime-${mode}`}>Truck docking time</Label>
          <Input
            id={`docktime-${mode}`}
            type="datetime-local"
            step={60}
            value={truckDockingLocal}
            onChange={(e) => setTruckDockingLocal(e.target.value)}
            className="w-full"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <p className="text-sm font-semibold">Damage (optional)</p>
        <p className="text-xs text-muted-foreground">
          Fill all four fields together, or leave all empty if there is no
          graded damage record.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={damageType || "__none__"}
              onValueChange={(v) => setDamageType(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Damage type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">NA</SelectItem>
                {(metadataEffective?.damage_types ?? []).map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select
              value={damageSeverity || "__none__"}
              onValueChange={(v) =>
                setDamageSeverity(v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">NA</SelectItem>
                {(metadataEffective?.damage_severities ?? []).map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cause</Label>
            <Select
              value={damageCause || "__none__"}
              onValueChange={(v) => setDamageCause(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cause" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">NA</SelectItem>
                {(metadataEffective?.damage_causes ?? []).map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <Select
              value={damageGrade || "__none__"}
              onValueChange={(v) => setDamageGrade(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">NA</SelectItem>
                {(metadataEffective?.damage_grades ?? []).map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {orderedItems.length > 0 ?
        (
          <section className="space-y-4 rounded-3xl border bg-card/80 p-4 shadow-sm">
            <p className="text-sm font-semibold">Checklist</p>
            {checklistGroupsEffective.map((group) => (
              <fieldset
                key={group.group_name}
                className="rounded-2xl border border-border/80 bg-background/50 p-3"
              >
                <legend className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.group_name}
                </legend>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.uuid}
                      className="rounded-xl border bg-background/60 p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {item.section}
                      </p>
                      <p className="mt-1 text-sm">{item.item_text}</p>
                      <div className="mt-2">
                        {item.field_type === "yes_no" ?
                          (
                            <div
                              role="group"
                              aria-label={item.item_text}
                              className="flex flex-wrap gap-x-6 gap-y-3"
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`chk-${mode}-${item.id}-yes`}
                                  checked={answers[item.id] === "yes"}
                                  onCheckedChange={(c) => {
                                    setAnswer(item.id, c === true ? "yes" : "");
                                  }}
                                />
                                <Label
                                  htmlFor={`chk-${mode}-${item.id}-yes`}
                                  className="cursor-pointer font-normal"
                                >
                                  Yes
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`chk-${mode}-${item.id}-no`}
                                  checked={answers[item.id] === "no"}
                                  onCheckedChange={(c) => {
                                    setAnswer(item.id, c === true ? "no" : "");
                                  }}
                                />
                                <Label
                                  htmlFor={`chk-${mode}-${item.id}-no`}
                                  className="cursor-pointer font-normal"
                                >
                                  No
                                </Label>
                              </div>
                            </div>
                          )
                        : (
                          <Input
                            value={answers[item.id] ?? ""}
                            onChange={(e) =>
                              setAnswer(item.id, e.target.value)
                            }
                            placeholder="Enter value"
                            className="mt-1 w-full max-w-xs"
                          />
                        )}
                      </div>
                      {item.allows_remarks ?
                        <Input
                          className="mt-2 text-sm"
                          placeholder="Remarks (optional)"
                          value={remarksMap[item.id] ?? ""}
                          onChange={(e) =>
                            setRemark(item.id, e.target.value)
                          }
                        />
                      : null}
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>
        )

      : (
        <div className="rounded-3xl border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          No checklist is available yet. Reload this page once the checklist is
          published in Admin.
        </div>
      )}

      <div
        className={
          embedded ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"
        }
      >
        {!embedded && onNavigateBack ?
          <Button type="button" variant="outline" onClick={onNavigateBack}>
            Back
          </Button>
        : null}
        {!embedded && !onNavigateBack ?
          <div />
        : null}
        <Button
          type="button"
          className={embedded ? "w-full" : undefined}
          disabled={submitting || orderedItems.length === 0}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "Starting…" : "Start inspection"}
        </Button>
      </div>
    </div>
  );
}
