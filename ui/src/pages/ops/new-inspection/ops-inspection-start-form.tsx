import { Camera, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { ChecklistAnswerEntry } from "@/api/generated/model/checklistAnswerEntry";
import type { ChecklistGroupBlock } from "@/api/generated/model/checklistGroupBlock";
import type { ChecklistItemResponse } from "@/api/generated/model/checklistItemResponse";
import type { DamageGrading } from "@/api/generated/model/damageGrading";
import type { DamageLikelyCause } from "@/api/generated/model/damageLikelyCause";
import type { DamageSeverity } from "@/api/generated/model/damageSeverity";
import type { DamageType } from "@/api/generated/model/damageType";
import type { InspectionMetadataResponse } from "@/api/generated/model/inspectionMetadataResponse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PAGES } from "@/endpoints";
import { cn } from "@/lib/utils";
import { OPS_BARCODE_LEN } from "@/pages/ops/new-inspection/constants";
import {
  type InspectionStartMode,
  toDatetimeLocalValue,
} from "@/pages/ops/new-inspection/inspection-start-shared";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getOrCreatePersistentDeviceId } from "@/lib/device-fingerprint";
import {
  fetchActiveInspectionChecklist,
  fetchInspectionMetadataForOps,
  opsInspectionApiError,
  startOpsInboundInspection,
  startOpsOutboundInspection,
} from "@/services/ops-inspections-api";

const MAX_IMAGE_BYTES = 600_000;

export type OpsInspectionStartFormProps = {
  mode: InspectionStartMode;
  barcode: string;
  onNavigateBack?: () => void;
};

type WizardStep = {
  key: string;
  title: string;
  group?: ChecklistGroupBlock;
};

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

function denseSectionClass(theme: "neutral" | "sky" | "amber") {
  return cn(
    "rounded-2xl border px-3 py-2.5 shadow-sm",
    theme === "neutral" &&
      "border-border/70 bg-muted/25 ring-1 ring-border/40",
    theme === "sky" &&
      "border-sky-500/25 bg-sky-500/[0.06] ring-1 ring-sky-500/15",
    theme === "amber" &&
      "border-amber-500/25 bg-amber-500/[0.06] ring-1 ring-amber-500/15",
  );
}

export function OpsInspectionStartForm({
  mode,
  barcode,
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
  const [loadingLocal, setLoadingLocal] = useState(true);

  useEffect(() => {
    let cancelled = false;
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
  }, []);

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
  const [noAnswerFiles, setNoAnswerFiles] = useState<Record<number, File[]>>({});

  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedSec =
    tick >= 0 ?
      Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
    : 0;

  const orderedItems = useMemo(
    () =>
      checklistGroups
        .flatMap((g) => g.items)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [checklistGroups],
  );

  const steps: WizardStep[] = useMemo(() => {
    const base: WizardStep[] = [
      { key: "site", title: "Shipment & site" },
      { key: "damage", title: "Damage (optional)" },
    ];
    for (const g of checklistGroups) {
      base.push({
        key: `group:${g.group_name}`,
        title: g.group_name,
        group: g,
      });
    }
    return base;
  }, [checklistGroups]);

  const step = steps[stepIndex] ?? steps[0];
  const totalSteps = Math.max(1, steps.length);
  const progressPct = ((stepIndex + 1) / totalSteps) * 100;
  const isLastStep = stepIndex >= steps.length - 1;

  const setAnswer = useCallback((id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setRemark = useCallback((id: number, value: string) => {
    setRemarksMap((prev) => ({ ...prev, [id]: value }));
  }, []);

  const appendNoFiles = useCallback((itemId: number, files: FileList | null) => {
    if (!files?.length) return;
    const next: File[] = [...(noAnswerFiles[itemId] ?? [])];
    for (const f of Array.from(files)) {
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name} is too large (max ${Math.round(MAX_IMAGE_BYTES / 1000)} KB).`);
        continue;
      }
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image.`);
        continue;
      }
      next.push(f);
    }
    setNoAnswerFiles((prev) => ({ ...prev, [itemId]: next }));
  }, [noAnswerFiles]);

  const removeNoFile = useCallback((itemId: number, index: number) => {
    setNoAnswerFiles((prev) => {
      const list = [...(prev[itemId] ?? [])];
      list.splice(index, 1);
      return { ...prev, [itemId]: list };
    });
  }, []);

  const validateSite = useCallback((): boolean => {
    if (!warehouseCode.trim()) {
      toast.error("Choose a warehouse.");
      return false;
    }
    if (mode === "inbound" && !plantCode.trim()) {
      toast.error("Choose a supplier plant.");
      return false;
    }
    if (!truckNumber.trim()) {
      toast.error("Truck number is required.");
      return false;
    }
    return true;
  }, [warehouseCode, plantCode, truckNumber, mode]);

  const validateDamage = useCallback((): boolean => {
    const parts = [
      damageType.trim(),
      damageSeverity.trim(),
      damageCause.trim(),
      damageGrade.trim(),
    ];
    const any = parts.some((p) => p.length > 0);
    const all = parts.every((p) => p.length > 0);
    if (any && !all) {
      toast.error("Damage: fill all four fields, or clear all.");
      return false;
    }
    return true;
  }, [damageType, damageSeverity, damageCause, damageGrade]);

  const validateGroup = useCallback(
    (group: ChecklistGroupBlock): boolean => {
      for (const item of group.items) {
        const v = (answers[item.id] ?? "").trim();
        if (!v) {
          toast.error(`Answer: ${item.item_text.slice(0, 48)}…`);
          return false;
        }
        if (item.field_type === "yes_no" && v === "no") {
          const files = noAnswerFiles[item.id] ?? [];
          const min = item.min_upload_files ?? 0;
          if (min > 0 && files.length < min) {
            toast.error(`“No” needs at least ${min} photo(s) for this question.`);
            return false;
          }
        }
      }
      return true;
    },
    [answers, noAnswerFiles],
  );

  const goNext = () => {
    if (step.key === "site" && !validateSite()) return;
    if (step.key === "damage" && !validateDamage()) return;
    if (step.group && !validateGroup(step.group)) return;
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));

  const buildChecklistAnswers = async (): Promise<ChecklistAnswerEntry[] | null> => {
    const out: ChecklistAnswerEntry[] = [];
    for (const item of orderedItems) {
      const value = answers[item.id]!.trim();
      const remarks = remarksMap[item.id]?.trim() || undefined;
      const files = noAnswerFiles[item.id] ?? [];
      let image_path: string[] | undefined;
      if (files.length > 0) {
        try {
          image_path = await Promise.all(files.map((f) => fileToDataUrl(f)));
        } catch {
          toast.error("Could not read one of the photos. Try again.");
          return null;
        }
      }
      out.push({
        id: item.id,
        value,
        remarks,
        ...(image_path?.length ? { image_path } : {}),
      });
    }
    return out;
  };

  const handleSubmit = async () => {
    if (barcode.length !== OPS_BARCODE_LEN) return;
    if (!validateSite() || !validateDamage()) return;
    for (const g of checklistGroups) {
      if (!validateGroup(g)) return;
    }
    if (orderedItems.length === 0) {
      toast.error("No checklist is published yet.");
      return;
    }

    const checklist_answers = await buildChecklistAnswers();
    if (!checklist_answers) return;

    const coords = await acquireLocation();
    if (!coords) {
      toast.error("Allow location access to start an inspection.");
      return;
    }

    const dockingIso = new Date(truckDockingLocal).toISOString();
    const deviceUuid = getOrCreatePersistentDeviceId();

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

  if (loadingLocal) {
    return (
      <div className="flex min-h-[32vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading form…</p>
      </div>
    );
  }

  const titleLabel =
    mode === "inbound" ? "Inbound inspection" : "Outbound inspection";
  const plantSelectValue =
    mode === "outbound" && !plantCode.trim() ? "__none_out__" : plantCode;
  const theme = mode === "inbound" ? "sky" : "amber";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {mode === "inbound" ? "Inbound" : "Outbound"}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{titleLabel}</h1>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {barcode}
          </p>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm tabular-nums",
            theme === "sky" &&
              "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-50",
            theme === "amber" &&
              "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-50",
          )}
        >
          <span className="text-muted-foreground text-xs">Time</span>
          {formatElapsed(elapsedSec)}
        </div>
      </header>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-foreground">{step.title}</span>
          <span className="tabular-nums text-muted-foreground">
            Step {stepIndex + 1} / {totalSteps}
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5 bg-muted" />
      </div>

      {step.key === "site" ?
        <section className={denseSectionClass(theme)}>
          <p className="mb-2 text-xs font-semibold text-foreground">
            Shipment &amp; site
          </p>
          <div className="space-y-2">
            <Label htmlFor={`w-${mode}`} className="text-xs">
              Warehouse
            </Label>
            <Select
              value={warehouseCode}
              onValueChange={setWarehouseCode}
              disabled={!metadata?.warehouses?.length}
            >
              <SelectTrigger id={`w-${mode}`} className="h-9 w-full">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {(metadata?.warehouses ?? []).map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-2 space-y-2">
            <Label htmlFor={`p-${mode}`} className="text-xs">
              {mode === "inbound" ? "Supplier plant" : "Plant (optional)"}
            </Label>
            <Select
              value={plantSelectValue}
              onValueChange={(v) =>
                setPlantCode(v === "__none_out__" ? "" : v)
              }
              disabled={!metadata?.plants?.length}
            >
              <SelectTrigger id={`p-${mode}`} className="h-9 w-full">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {mode === "outbound" ?
                  <SelectItem value="__none_out__">NA</SelectItem>
                : null}
                {(metadata?.plants ?? []).map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`tr-${mode}`} className="text-xs">
                Truck #
              </Label>
              <Input
                id={`tr-${mode}`}
                value={truckNumber}
                onChange={(e) => setTruckNumber(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`dk-${mode}`} className="text-xs">
                Dock
              </Label>
              <Input
                id={`dk-${mode}`}
                value={dockNumber}
                onChange={(e) => setDockNumber(e.target.value)}
                placeholder="Optional"
                className="h-9"
              />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <Label htmlFor={`dt-${mode}`} className="text-xs">
              Truck docking time
            </Label>
            <Input
              id={`dt-${mode}`}
              type="datetime-local"
              step={60}
              value={truckDockingLocal}
              onChange={(e) => setTruckDockingLocal(e.target.value)}
              className="h-9"
            />
          </div>
        </section>
      : null}

      {step.key === "damage" ?
        <section className={denseSectionClass(theme)}>
          <p className="mb-2 text-xs font-semibold text-foreground">
            Damage (optional)
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Fill all four or leave all empty.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <DamageSelect
              label="Type"
              value={damageType}
              onChange={setDamageType}
              options={metadata?.damage_types ?? []}
            />
            <DamageSelect
              label="Severity"
              value={damageSeverity}
              onChange={setDamageSeverity}
              options={metadata?.damage_severities ?? []}
            />
            <DamageSelect
              label="Cause"
              value={damageCause}
              onChange={setDamageCause}
              options={metadata?.damage_causes ?? []}
            />
            <DamageSelect
              label="Grade"
              value={damageGrade}
              onChange={setDamageGrade}
              options={metadata?.damage_grades ?? []}
            />
          </div>
        </section>
      : null}

      {step.group ?
        <section className={denseSectionClass(theme)}>
          <p className="mb-2 text-xs font-semibold text-foreground">
            {step.group.group_name}
          </p>
          <div className="space-y-2">
            {step.group.items.map((item) => (
              <ChecklistItemCard
                key={item.uuid}
                item={item}
                mode={mode}
                answer={answers[item.id] ?? ""}
                onAnswerChange={setAnswer}
                remark={remarksMap[item.id] ?? ""}
                onRemarkChange={setRemark}
                files={noAnswerFiles[item.id] ?? []}
                onPickFiles={(fl) => appendNoFiles(item.id, fl)}
                onRemoveFile={(ix) => removeNoFile(item.id, ix)}
              />
            ))}
          </div>
        </section>
      : null}

      <footer className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {onNavigateBack ?
            <Button type="button" variant="ghost" size="sm" onClick={onNavigateBack}>
              Back
            </Button>
          : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={stepIndex === 0}
            onClick={goPrev}
          >
            Previous
          </Button>
        </div>
        {!isLastStep ?
          <Button type="button" size="sm" onClick={goNext}>
            Next
          </Button>
        : (
          <Button
            type="button"
            size="sm"
            disabled={submitting || orderedItems.length === 0}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Starting…" : "Submit inspection"}
          </Button>
        )}
      </footer>

      {orderedItems.length === 0 ?
        <p className="text-center text-xs text-muted-foreground">
          No checklist published — you cannot submit yet.
        </p>
      : null}
    </div>
  );
}

function DamageSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value || "__none__"}
        onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">NA</SelectItem>
          {options.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ChecklistItemCard({
  item,
  mode,
  answer,
  onAnswerChange,
  remark,
  onRemarkChange,
  files,
  onPickFiles,
  onRemoveFile,
}: {
  item: ChecklistItemResponse;
  mode: InspectionStartMode;
  answer: string;
  onAnswerChange: (id: number, v: string) => void;
  remark: string;
  onRemarkChange: (id: number, v: string) => void;
  files: File[];
  onPickFiles: (fl: FileList | null) => void;
  onRemoveFile: (index: number) => void;
}) {
  const isNo = answer === "no";
  const isYes = answer === "yes";

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-2.5 shadow-sm">
      <p className="text-[11px] font-medium text-muted-foreground">
        {item.section}
      </p>
      <p className="mt-0.5 text-sm font-medium leading-snug">{item.item_text}</p>

      {item.field_type === "yes_no" ?
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2">
            <span
              className={cn(
                "text-sm font-semibold",
                isNo ? "text-foreground" : "text-muted-foreground",
              )}
            >
              No
            </span>
            <Switch
              checked={isYes}
              onCheckedChange={(c) =>
                onAnswerChange(item.id, c ? "yes" : "no")
              }
              className={cn(
                "h-9 w-14 shrink-0",
                mode === "inbound"
                  ? "data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-muted"
                  : "data-[state=checked]:bg-amber-600 data-[state=unchecked]:bg-muted",
              )}
            />
            <span
              className={cn(
                "text-sm font-semibold",
                isYes ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Yes
            </span>
          </div>

          {isNo ?
            <div className="space-y-2 rounded-lg border border-dashed border-border/80 bg-muted/10 p-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Because you answered No — add context (photos help)
              </p>
              <Textarea
                value={remark}
                onChange={(e) => onRemarkChange(item.id, e.target.value)}
                placeholder="What did you observe?"
                className="min-h-[4.5rem] resize-none text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Camera className="mr-1.5 h-3.5 w-3.5" />
                    Add photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        onPickFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                {item.min_upload_files > 0 ?
                  <span className="text-[11px] text-muted-foreground">
                    Min {item.min_upload_files} image(s)
                  </span>
                : null}
              </div>
              {files.length > 0 ?
                <ul className="flex flex-wrap gap-1.5 text-[11px]">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5"
                    >
                      <span className="max-w-[140px] truncate">{f.name}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => onRemoveFile(i)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              : null}
            </div>
          : null}
        </div>
      : (
        <div className="mt-2 space-y-2">
          <Input
            value={answer}
            onChange={(e) => onAnswerChange(item.id, e.target.value)}
            placeholder="Your answer"
            className="h-9 text-sm"
          />
          {item.allows_remarks ?
            <Input
              value={remark}
              onChange={(e) => onRemarkChange(item.id, e.target.value)}
              placeholder="Remarks (optional)"
              className="h-9 text-sm"
            />
          : null}
        </div>
      )}
    </div>
  );
}
