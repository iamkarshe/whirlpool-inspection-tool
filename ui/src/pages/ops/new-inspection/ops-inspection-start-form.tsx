import { ArrowLeft, Camera, Loader2, RotateCcw, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type BlockerFunction,
  useBlocker,
  useNavigate,
} from "react-router-dom";
import { toast } from "sonner";

import type { ChecklistAnswerEntry } from "@/api/generated/model/checklistAnswerEntry";
import type { ChecklistGroupBlock } from "@/api/generated/model/checklistGroupBlock";
import type { ChecklistItemResponse } from "@/api/generated/model/checklistItemResponse";
import type { DamageGrading } from "@/api/generated/model/damageGrading";
import type { DamageLikelyCause } from "@/api/generated/model/damageLikelyCause";
import type { DamageSeverity } from "@/api/generated/model/damageSeverity";
import type { DamageType } from "@/api/generated/model/damageType";
import type { InspectionMetadataResponse } from "@/api/generated/model/inspectionMetadataResponse";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
  clearInspectionDraft,
  loadInspectionDraft,
  type NoAnswerImageSlot,
  type OpsInspectionDraftV1,
  saveInspectionDraft,
} from "@/pages/ops/new-inspection/inspection-draft-storage";
import {
  noAnswerImageDisplaySrc,
  noAnswerImageHasServerPath,
  noAnswerImageSubmitPaths,
} from "@/pages/ops/new-inspection/no-answer-image";
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
  uploadOpsInspectionImage,
} from "@/services/ops-inspections-api";

const MAX_IMAGE_BYTES = 600_000;
/** How often we flush the draft ref to localStorage (ref is updated every render). */
const DRAFT_SAVE_INTERVAL_MS = 2500;

/** Stable empty list so memoized checklist rows do not re-render when a sibling updates images. */
const NO_ANSWER_IMAGES_EMPTY: NoAnswerImageSlot[] = [];

export type OpsInspectionStartFormProps = {
  mode: InspectionStartMode;
  barcode: string;
  /** Navigate target after user confirms leaving the inspection page. */
  unitBackTo: string;
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

/** Owns the 1s tick so the large form does not re-render every second (keeps inputs responsive). */
function InspectionElapsedTimer({
  startedAt,
  theme,
}: {
  startedAt: number;
  theme: "sky" | "amber";
}) {
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const tick = () => {
      setElapsedSec(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return (
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
  );
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

function numMapFromStringRecord(
  r: Record<string, string> | undefined,
): Record<number, string> {
  const out: Record<number, string> = {};
  if (!r) return out;
  for (const [k, v] of Object.entries(r)) {
    const id = Number(k);
    if (!Number.isNaN(id)) out[id] = v;
  }
  return out;
}

function imagesFromDraft(
  r: Record<string, NoAnswerImageSlot[]> | undefined,
): Record<number, NoAnswerImageSlot[]> {
  const out: Record<number, NoAnswerImageSlot[]> = {};
  if (!r) return out;
  for (const [k, v] of Object.entries(r)) {
    const id = Number(k);
    if (!Number.isNaN(id) && Array.isArray(v)) out[id] = v;
  }
  return out;
}

export function OpsInspectionStartForm({
  mode,
  barcode,
  unitBackTo,
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

  const [startedAt, setStartedAt] = useState(() => Date.now());
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
  const [noAnswerImages, setNoAnswerImages] = useState<
    Record<number, NoAnswerImageSlot[]>
  >({});
  const [photoUploadCountByItem, setPhotoUploadCountByItem] = useState<
    Record<number, number>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [validationDialog, setValidationDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [noDamageAckOpen, setNoDamageAckOpen] = useState(false);
  const [draftSaveReady, setDraftSaveReady] = useState(false);
  const leaveIntentRef = useRef<"barcode" | "blocker" | null>(null);
  const draftHydratedRef = useRef(false);
  const draftPayloadRef = useRef<OpsInspectionDraftV1 | null>(null);

  useEffect(() => {
    draftHydratedRef.current = false;
    setDraftSaveReady(false);
  }, [mode, barcode]);

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
      { key: "site", title: "Shipment and site" },
      { key: "damage", title: "Damage" },
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
  const previousStepTitle = stepIndex > 0 ? steps[stepIndex - 1]?.title ?? "" : "";

  useEffect(() => {
    if (loadingLocal || draftHydratedRef.current) return;
    const t = window.setTimeout(() => {
      if (draftHydratedRef.current) return;
      const draft = loadInspectionDraft(mode, barcode);
      if (!draft) {
        draftHydratedRef.current = true;
        setDraftSaveReady(true);
        return;
      }
      setStartedAt(draft.startedAt);
      setWarehouseCode(draft.warehouseCode);
      setPlantCode(draft.plantCode);
      setTruckNumber(draft.truckNumber);
      setDockNumber(draft.dockNumber);
      setTruckDockingLocal(draft.truckDockingLocal);
      setDamageType(draft.damageType);
      setDamageSeverity(draft.damageSeverity);
      setDamageCause(draft.damageCause);
      setDamageGrade(draft.damageGrade);
      setAnswers(numMapFromStringRecord(draft.answers));
      setRemarksMap(numMapFromStringRecord(draft.remarksMap));
      setNoAnswerImages(imagesFromDraft(draft.noAnswerImages));
      const stepCount = Math.max(1, 2 + checklistGroups.length);
      setStepIndex(Math.min(Math.max(0, draft.stepIndex), stepCount - 1));
      draftHydratedRef.current = true;
      setDraftSaveReady(true);
    }, 320);
    return () => window.clearTimeout(t);
  }, [loadingLocal, mode, barcode, checklistGroups]);

  const dirty = useMemo(() => {
    if (stepIndex > 0) return true;
    if (warehouseCode.trim()) return true;
    if (plantCode.trim()) return true;
    if (truckNumber.trim()) return true;
    if (dockNumber.trim()) return true;
    if (damageType || damageSeverity || damageCause || damageGrade) return true;
    if (Object.keys(answers).length > 0) return true;
    if (Object.values(remarksMap).some((r) => r.trim())) return true;
    if (Object.values(noAnswerImages).some((arr) => arr.length > 0)) return true;
    return false;
  }, [
    stepIndex,
    warehouseCode,
    plantCode,
    truckNumber,
    dockNumber,
    damageType,
    damageSeverity,
    damageCause,
    damageGrade,
    answers,
    remarksMap,
    noAnswerImages,
  ]);

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const shouldBlockNavigation = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      if (!dirtyRef.current) return false;
      return (
        currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search
      );
    },
    [],
  );

  const blocker = useBlocker(shouldBlockNavigation);

  useEffect(() => {
    if (blocker.state === "blocked") {
      leaveIntentRef.current = "blocker";
      setLeaveDialogOpen(true);
    }
  }, [blocker.state]);

  useEffect(() => {
    if (!dirty || loadingLocal) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, loadingLocal]);

  useEffect(() => {
    if (!draftSaveReady || loadingLocal) return;
    const id = window.setInterval(() => {
      const p = draftPayloadRef.current;
      if (p) saveInspectionDraft(mode, barcode, p);
    }, DRAFT_SAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [mode, barcode, loadingLocal, draftSaveReady]);

  useEffect(() => {
    if (!draftSaveReady || loadingLocal) return;
    const p = draftPayloadRef.current;
    if (p) saveInspectionDraft(mode, barcode, p);
  }, [stepIndex, mode, barcode, loadingLocal, draftSaveReady]);

  const setAnswer = useCallback((id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setRemark = useCallback((id: number, value: string) => {
    setRemarksMap((prev) => ({ ...prev, [id]: value }));
  }, []);

  const adjustPhotoUploadCount = useCallback((itemId: number, delta: number) => {
    setPhotoUploadCountByItem((prev) => {
      const next = { ...prev };
      const n = (next[itemId] ?? 0) + delta;
      if (n <= 0) delete next[itemId];
      else next[itemId] = n;
      return next;
    });
  }, []);

  const addNoAnswerImages = useCallback(
    async (itemId: number, files: FileList | null) => {
      if (!files?.length) return;
      if (barcode.length !== OPS_BARCODE_LEN) {
        toast.error("Barcode must be set before uploading photos.");
        return;
      }
      const accepted: File[] = [];
      for (const f of Array.from(files)) {
        if (f.size > MAX_IMAGE_BYTES) {
          toast.error(
            `${f.name} is too large (max ${Math.round(MAX_IMAGE_BYTES / 1000)} KB).`,
          );
          continue;
        }
        if (!f.type.startsWith("image/")) {
          toast.error(`${f.name} is not an image.`);
          continue;
        }
        accepted.push(f);
      }
      if (!accepted.length) return;

      const results = await Promise.all(
        accepted.map(async (f) => {
          adjustPhotoUploadCount(itemId, 1);
          try {
            const { path } = await uploadOpsInspectionImage({
              barcode,
              mode,
              file: f,
            });
            return { name: f.name, path } satisfies NoAnswerImageSlot;
          } catch (e: unknown) {
            toast.error(
              opsInspectionApiError(e, `Could not upload ${f.name}. Try again.`),
            );
            return null;
          } finally {
            adjustPhotoUploadCount(itemId, -1);
          }
        }),
      );
      const additions = results.filter(
        (r): r is NoAnswerImageSlot => r !== null && !!r.path,
      );
      if (!additions.length) return;
      setNoAnswerImages((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] ?? []), ...additions],
      }));
    },
    [adjustPhotoUploadCount, barcode, mode],
  );

  const removeNoAnswerImage = useCallback((itemId: number, index: number) => {
    setNoAnswerImages((prev) => {
      const list = [...(prev[itemId] ?? [])];
      list.splice(index, 1);
      const next = { ...prev };
      if (list.length) next[itemId] = list;
      else delete next[itemId];
      return next;
    });
  }, []);

  const pickNoAnswerFilesForItem = useCallback(
    (itemId: number, files: FileList | null) => {
      void addNoAnswerImages(itemId, files);
    },
    [addNoAnswerImages],
  );

  const removeNoAnswerImageForItem = useCallback(
    (itemId: number, index: number) => {
      removeNoAnswerImage(itemId, index);
    },
    [removeNoAnswerImage],
  );

  const siteStepError = useCallback((): string | null => {
    if (!warehouseCode.trim()) return "Choose a warehouse from the list.";
    if (mode === "inbound" && !plantCode.trim()) {
      return "Choose a supplier plant.";
    }
    if (!truckNumber.trim()) return "Enter the truck number.";
    return null;
  }, [warehouseCode, plantCode, truckNumber, mode]);

  const damageStepError = useCallback((): string | null => {
    const parts = [
      damageType.trim(),
      damageSeverity.trim(),
      damageCause.trim(),
      damageGrade.trim(),
    ];
    const any = parts.some((p) => p.length > 0);
    const all = parts.every((p) => p.length > 0);
    if (any && !all) {
      return "If you use any damage field you must fill all four (type, severity, cause, grade), or set them all back to NA.";
    }
    return null;
  }, [damageType, damageSeverity, damageCause, damageGrade]);

  const groupStepError = useCallback(
    (group: ChecklistGroupBlock): string | null => {
      for (const item of group.items) {
        const v = (answers[item.id] ?? "").trim();
        if (!v) {
          const label = item.item_text.trim();
          const short =
            label.length > 100 ? `${label.slice(0, 100)}…` : label;
          return `Answer every question in this section. Still missing: “${short}”.`;
        }
        if (item.field_type === "yes_no" && v === "no") {
          const imgs = noAnswerImages[item.id] ?? [];
          const min = item.min_upload_files ?? 0;
          const uploaded = imgs.filter(noAnswerImageHasServerPath).length;
          if (min > 0 && uploaded < min) {
            return `You answered No — upload at least ${min} photo(s) for that question (each file is sent to the server when you pick it).`;
          }
        }
      }
      return null;
    },
    [answers, noAnswerImages],
  );

  const goNext = () => {
    if (step.key === "site") {
      const err = siteStepError();
      if (err) {
        setValidationDialog({
          title: "Complete shipment and site",
          message: err,
        });
        return;
      }
    }
    if (step.key === "damage") {
      const err = damageStepError();
      if (err) {
        setValidationDialog({ title: "Fix damage details", message: err });
        return;
      }
      const damageAllNa =
        !damageType.trim() &&
        !damageSeverity.trim() &&
        !damageCause.trim() &&
        !damageGrade.trim();
      if (damageAllNa) {
        setNoDamageAckOpen(true);
        return;
      }
    }
    if (step.group) {
      const err = groupStepError(step.group);
      if (err) {
        setValidationDialog({ title: "Complete this step", message: err });
        return;
      }
    }
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));

  const buildChecklistAnswers = (): ChecklistAnswerEntry[] => {
    const out: ChecklistAnswerEntry[] = [];
    for (const item of orderedItems) {
      const value = answers[item.id]!.trim();
      const remarks = remarksMap[item.id]?.trim() || undefined;
      const imgs = noAnswerImages[item.id] ?? [];
      const paths = noAnswerImageSubmitPaths(imgs);
      const image_path = paths.length ? paths : undefined;
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
    if (barcode.length !== OPS_BARCODE_LEN) {
      setValidationDialog({
        title: "Invalid barcode",
        message:
          "The product barcode on this page looks incomplete. Go back to the unit screen and scan again.",
      });
      return;
    }
    const siteErr = siteStepError();
    if (siteErr) {
      setValidationDialog({
        title: "Complete shipment and site",
        message: siteErr,
      });
      return;
    }
    const damageErr = damageStepError();
    if (damageErr) {
      setValidationDialog({ title: "Fix damage details", message: damageErr });
      return;
    }
    for (const g of checklistGroups) {
      const gErr = groupStepError(g);
      if (gErr) {
        setValidationDialog({
          title: "Checklist incomplete",
          message: gErr,
        });
        return;
      }
    }
    if (orderedItems.length === 0) {
      setValidationDialog({
        title: "Nothing to submit",
        message:
          "No checklist is published yet. You cannot start an inspection until a checklist is available.",
      });
      return;
    }

    const checklist_answers = buildChecklistAnswers();

    const coords = await acquireLocation();
    if (!coords) {
      setValidationDialog({
        title: "Location required",
        message:
          "Allow location access in your browser when prompted, or turn it on in site settings for this page, so we can record where the inspection starts.",
      });
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
        clearInspectionDraft(mode, barcode);
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
        clearInspectionDraft(mode, barcode);
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

  const confirmLeave = () => {
    setLeaveDialogOpen(false);
    if (leaveIntentRef.current === "blocker") {
      blocker.proceed?.();
    } else {
      navigate(unitBackTo);
    }
    leaveIntentRef.current = null;
  };

  const cancelLeave = () => {
    setLeaveDialogOpen(false);
    if (leaveIntentRef.current === "blocker") {
      blocker.reset?.();
    }
    leaveIntentRef.current = null;
  };

  const requestLeaveViaBarcode = () => {
    if (!dirty) {
      navigate(unitBackTo);
      return;
    }
    leaveIntentRef.current = "barcode";
    setLeaveDialogOpen(true);
  };

  const performRestart = useCallback(() => {
    clearInspectionDraft(mode, barcode);
    setStartedAt(Date.now());
    setWarehouseCode("");
    setPlantCode("");
    setTruckNumber("");
    setDockNumber("");
    setTruckDockingLocal(toDatetimeLocalValue());
    setDamageType("");
    setDamageSeverity("");
    setDamageCause("");
    setDamageGrade("");
    setAnswers({});
    setRemarksMap({});
    setNoAnswerImages({});
    setPhotoUploadCountByItem({});
    setStepIndex(0);
    setRestartDialogOpen(false);
    setValidationDialog(null);
    draftHydratedRef.current = true;
    setDraftSaveReady(true);
    toast.success("Inspection reset — timer at 0:00 and saved draft removed.");
  }, [mode, barcode]);

  if (loadingLocal) {
    return (
      <div className="flex min-h-[32vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading form…</p>
      </div>
    );
  }

  const answersStr: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) answersStr[String(k)] = v;
  const remarksStr: Record<string, string> = {};
  for (const [k, v] of Object.entries(remarksMap)) remarksStr[String(k)] = v;
  const imagesStr: Record<string, NoAnswerImageSlot[]> = {};
  for (const [k, v] of Object.entries(noAnswerImages)) {
    if (v?.length) imagesStr[String(k)] = v;
  }
  draftPayloadRef.current = {
    v: 1,
    startedAt,
    stepIndex,
    warehouseCode,
    plantCode,
    truckNumber,
    dockNumber,
    truckDockingLocal,
    damageType,
    damageSeverity,
    damageCause,
    damageGrade,
    answers: answersStr,
    remarksMap: remarksStr,
    noAnswerImages: imagesStr,
  };

  const titleLabel =
    mode === "inbound" ? "Inbound inspection" : "Outbound inspection";
  const plantSelectValue =
    mode === "outbound" && !plantCode.trim() ? "__none_out__" : plantCode;
  const theme = mode === "inbound" ? "sky" : "amber";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              Progress is saved on this device so a refresh will not lose answers.
              Leave this page anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={validationDialog !== null}
        onOpenChange={(open) => {
          if (!open) setValidationDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {validationDialog?.title ?? "Check your input"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {validationDialog?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setValidationDialog(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={noDamageAckOpen} onOpenChange={setNoDamageAckOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No damage recorded</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              All damage fields are NA — there is no damage to inspect for this
              shipment. Continue to the checklist when that is correct.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on this step</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setNoDamageAckOpen(false);
                setStepIndex((i) => Math.min(steps.length - 1, i + 1));
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart this inspection?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              This clears every answer, shipment fields, damage, photos, and the
              timer. The draft saved on this device for this barcode will be
              removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={performRestart}
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {mode === "inbound" ? "Inbound" : "Outbound"}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{titleLabel}</h1>
          <button
            type="button"
            onClick={requestLeaveViaBarcode}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs transition-colors",
              "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
            )}
            title="Back to product — tap to leave this page"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">{barcode}</span>
          </button>
        </div>
        <InspectionElapsedTimer startedAt={startedAt} theme={theme} />
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
          <div className="space-y-2">
            {step.group.items.map((item) => (
              <ChecklistItemCard
                key={item.uuid}
                item={item}
                answer={answers[item.id] ?? ""}
                onAnswerChange={setAnswer}
                remark={remarksMap[item.id] ?? ""}
                onRemarkChange={setRemark}
                images={noAnswerImages[item.id] ?? NO_ANSWER_IMAGES_EMPTY}
                onPickFiles={pickNoAnswerFilesForItem}
                onRemoveImage={removeNoAnswerImageForItem}
                uploadingPhotoCount={photoUploadCountByItem[item.id] ?? 0}
              />
            ))}
          </div>
        </section>
      : null}

      <footer className="flex flex-col gap-2 pt-1">
        {stepIndex > 0 ?
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 w-full justify-start gap-2 px-3 py-2"
            onClick={goPrev}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="min-w-0 text-left">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Back
              </span>
              <span className="block truncate text-sm font-medium leading-tight">
                {previousStepTitle}
              </span>
            </span>
          </Button>
        : null}
        {!isLastStep ?
          <Button type="button" className="w-full" onClick={goNext}>
            Next
          </Button>
        : (
          <Button
            type="button"
            className="w-full"
            disabled={submitting || orderedItems.length === 0}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Starting…" : "Submit inspection"}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full gap-2 text-rose-800/80 hover:bg-rose-500/[0.08] hover:text-rose-900 dark:text-rose-300/75 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
          onClick={() => setRestartDialogOpen(true)}
        >
          <RotateCcw className="h-4 w-4 shrink-0" />
          Restart the Inspection
        </Button>
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

const ChecklistItemCard = memo(function ChecklistItemCard({
  item,
  answer,
  onAnswerChange,
  remark,
  onRemarkChange,
  images,
  onPickFiles,
  onRemoveImage,
  uploadingPhotoCount = 0,
}: {
  item: ChecklistItemResponse;
  answer: string;
  onAnswerChange: (id: number, v: string) => void;
  remark: string;
  onRemarkChange: (id: number, v: string) => void;
  images: NoAnswerImageSlot[];
  onPickFiles: (itemId: number, files: FileList | null) => void;
  onRemoveImage: (itemId: number, index: number) => void;
  uploadingPhotoCount?: number;
}) {
  const isNo = answer === "no";
  const isYes = answer === "yes";

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-2.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            {item.section}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug">{item.item_text}</p>
        </div>
        {item.field_type === "yes_no" && (isYes || isNo) ?
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-[10px] font-semibold uppercase",
              isYes &&
                "border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
              isNo &&
                "border-rose-500/50 bg-rose-500/15 text-rose-900 dark:text-rose-100",
            )}
          >
            {isYes ? "Yes" : "No"}
          </Badge>
        : null}
      </div>

      {item.field_type === "yes_no" ?
        <div className="mt-2 space-y-2">
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border-2 px-2.5 py-2.5 transition-colors",
              isYes &&
                "border-emerald-500/70 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]",
              isNo &&
                "border-rose-500/70 bg-rose-500/12 shadow-[0_0_0_1px_rgba(244,63,94,0.12)]",
              !isYes &&
                !isNo &&
                "border-border/60 bg-muted/15",
            )}
          >
            <button
              type="button"
              aria-pressed={isNo}
              onClick={() => onAnswerChange(item.id, "no")}
              className={cn(
                "shrink-0 rounded-md border border-transparent px-2 py-1 text-sm font-bold tracking-tight transition-colors",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                isNo ? "text-rose-700 dark:text-rose-200" : "text-muted-foreground hover:text-foreground",
              )}
            >
              No
            </button>
            <Switch
              checked={isYes}
              onCheckedChange={(c) =>
                onAnswerChange(item.id, c ? "yes" : "no")
              }
              className={cn(
                "h-9 w-14 shrink-0 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-rose-600",
              )}
            />
            <button
              type="button"
              aria-pressed={isYes}
              onClick={() => onAnswerChange(item.id, "yes")}
              className={cn(
                "shrink-0 rounded-md border border-transparent px-2 py-1 text-sm font-bold tracking-tight transition-colors",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                isYes ?
                  "text-emerald-700 dark:text-emerald-200"
                : "text-muted-foreground hover:text-foreground",
              )}
            >
              Yes
            </button>
          </div>

          {isNo ?
            <div className="space-y-2 rounded-lg border border-dashed border-rose-500/25 bg-rose-500/[0.04] p-2">
              <p className="text-[11px] font-medium text-rose-900/80 dark:text-rose-100/90">
                You chose No — add remarks and photos if useful
              </p>
              <Textarea
                value={remark}
                onChange={(e) => onRemarkChange(item.id, e.target.value)}
                placeholder="What did you observe?"
                className="min-h-[4.5rem] resize-none text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  asChild
                  disabled={uploadingPhotoCount > 0}
                >
                  <label
                    className={cn(
                      "cursor-pointer",
                      uploadingPhotoCount > 0 && "pointer-events-none opacity-60",
                    )}
                  >
                    {uploadingPhotoCount > 0 ?
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    : (
                      <Camera className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {uploadingPhotoCount > 0 ? "Uploading…" : "Add photos"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      disabled={uploadingPhotoCount > 0}
                      onChange={(e) => {
                        onPickFiles(item.id, e.target.files);
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
              {images.length > 0 ?
                <ul className="flex flex-wrap gap-1.5">
                  {images.map((img, i) => (
                    <li
                      key={`${img.path ?? img.url ?? "img"}-${i}`}
                      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border/80 bg-muted shadow-sm"
                    >
                      <img
                        src={noAnswerImageDisplaySrc(img)}
                        alt=""
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white shadow-sm ring-1 ring-black/20 backdrop-blur-[2px] transition-colors hover:bg-black/70"
                        onClick={() => onRemoveImage(item.id, i)}
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
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
});
