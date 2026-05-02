import type { InspectionStartMode } from "@/pages/ops/new-inspection/inspection-start-shared";

export const OPS_INSPECTION_DRAFT_VERSION = 1 as const;

export type NoAnswerImageSlot = {
  name: string;
  /** Data URL (image/*) for persistence and submit */
  url: string;
};

/** Serializable draft saved to localStorage between sessions. */
export type OpsInspectionDraftV1 = {
  v: typeof OPS_INSPECTION_DRAFT_VERSION;
  startedAt: number;
  stepIndex: number;
  warehouseCode: string;
  plantCode: string;
  truckNumber: string;
  dockNumber: string;
  truckDockingLocal: string;
  damageType: string;
  damageSeverity: string;
  damageCause: string;
  damageGrade: string;
  answers: Record<string, string>;
  remarksMap: Record<string, string>;
  noAnswerImages: Record<string, NoAnswerImageSlot[]>;
};

export function inspectionDraftKey(mode: InspectionStartMode, barcode: string) {
  return `ops-inspection-draft:v${OPS_INSPECTION_DRAFT_VERSION}:${mode}:${barcode}`;
}

export function loadInspectionDraft(
  mode: InspectionStartMode,
  barcode: string,
): OpsInspectionDraftV1 | null {
  try {
    const raw = localStorage.getItem(inspectionDraftKey(mode, barcode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpsInspectionDraftV1;
    if (parsed?.v !== OPS_INSPECTION_DRAFT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveInspectionDraft(
  mode: InspectionStartMode,
  barcode: string,
  draft: OpsInspectionDraftV1,
) {
  try {
    localStorage.setItem(
      inspectionDraftKey(mode, barcode),
      JSON.stringify(draft),
    );
  } catch {
    /* quota or private mode */
  }
}

export function clearInspectionDraft(mode: InspectionStartMode, barcode: string) {
  try {
    localStorage.removeItem(inspectionDraftKey(mode, barcode));
  } catch {
    /* ignore */
  }
}
