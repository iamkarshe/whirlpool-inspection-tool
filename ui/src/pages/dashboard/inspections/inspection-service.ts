export type {
  Inspection,
  InspectionChecklistLayerCounts,
  InspectionImage,
  InspectionKpis,
  InspectionQuestionResult,
  InspectionQuestionStatus,
  InspectionRelationship,
  InspectionRelationshipScan,
  InspectionSectionKey,
  InspectionType,
} from "@/pages/dashboard/inspections/inspection-types";

import type {
  Inspection,
  InspectionKpis,
  InspectionQuestionResult,
  InspectionRelationship,
  InspectionRelationshipScan,
  InspectionSectionKey,
} from "@/pages/dashboard/inspections/inspection-types";
import type { DateRange } from "react-day-picker";

import type { MultiSelectFiltersValue } from "@/components/filters/multi-select-filters-dialog";
import { buildInspectionKpisApiParams } from "@/pages/dashboard/inspections/components/inspection-list-query";
import {
  deriveIsUnderReviewFromReviewStatus,
  fetchAllInspectionRows,
  fetchInspectionDetail,
  fetchInspectionInputsAsQuestionRows,
  fetchInspectionKpis,
  isoToApiDate,
  mapInspectionFullToInspection,
  mapInputsForSection,
} from "@/services/inspections-api";
import { fetchManagerTeamInspectionKpis } from "@/services/ops-inspections-api";
import type { InspectionFullResponse } from "@/api/generated/model/inspectionFullResponse";

export async function getInspectionQuestionResults(
  inspectionUuid: string,
  section: InspectionSectionKey,
): Promise<InspectionQuestionResult[]> {
  return fetchInspectionInputsAsQuestionRows(inspectionUuid, section);
}

/**
 * Loads every inspection page — avoid on dashboard list routes.
 * Use `useInspectionsServerTable` + `fetchInspectionsPage` instead.
 */
export async function getInspections(): Promise<Inspection[]> {
  return fetchAllInspectionRows({
    sort_by: "created_at",
    sort_dir: "desc",
  });
}

/** Manager home badge: `review_queue` from `GET /api/inspections/kpis/manager` (today). */
export async function fetchManagerReviewQueueCount(opts?: {
  signal?: AbortSignal;
}): Promise<number> {
  const kpis = await fetchManagerTeamInspectionKpis(
    { period: "today" as const },
    opts,
  );
  return kpis.review_queue ?? 0;
}

export function inspectionIsPendingManagerReview(inspection: Inspection): boolean {
  return (
    inspection.is_under_review === true ||
    deriveIsUnderReviewFromReviewStatus(inspection.review_status ?? "")
  );
}

/**
 * Ops inspection list — loads every page. Prefer `useOpsInspectionsPagedList` in UI.
 */
export async function getInspectionsForOpsList(
  query: {
    date_from: string;
    date_to: string;
    inspection_type?: "inbound" | "outbound" | null;
  },
  opts?: { signal?: AbortSignal },
): Promise<Inspection[]> {
  return fetchAllInspectionRows(
    {
      sort_by: "created_at",
      sort_dir: "desc",
      date_field: "created_at",
      date_from: query.date_from,
      date_to: query.date_to,
      inspection_type: query.inspection_type ?? null,
    },
    opts,
  );
}

export async function getInspectionById(
  id: string,
  opts?: { signal?: AbortSignal },
): Promise<Inspection | null> {
  if (!id?.trim()) return null;
  try {
    const full = await fetchInspectionDetail(id.trim(), opts);
    return mapInspectionFullToInspection(full);
  } catch {
    return null;
  }
}

export type InspectionDetailBundle = {
  inspection: Inspection;
  outer: InspectionQuestionResult[];
  inner: InspectionQuestionResult[];
  product: InspectionQuestionResult[];
  device: InspectionQuestionResult[];
};

/** One `GET /api/inspections/{uuid}` — inspection row plus checklist inputs for all sections. */
export async function getInspectionDetailBundle(
  id: string,
  opts?: { signal?: AbortSignal },
): Promise<InspectionDetailBundle | null> {
  if (!id?.trim()) return null;
  const full = await fetchInspectionDetail(id.trim(), opts);
  return mapInspectionFullToDetailBundle(full);
}

export function mapInspectionFullToDetailBundle(
  full: InspectionFullResponse,
): InspectionDetailBundle {
  const inputs = full.inputs ?? [];
  return {
    inspection: mapInspectionFullToInspection(full),
    outer: mapInputsForSection(inputs, "outer-packaging"),
    inner: mapInputsForSection(inputs, "inner-packaging"),
    product: mapInputsForSection(inputs, "product"),
    device: mapInputsForSection(inputs, "device"),
  };
}

function checklistTotals(inspection: Inspection): {
  passed: number;
  failed: number;
} {
  const layers = inspection.checklist_layers;
  if (!layers) return { passed: 0, failed: 0 };
  return (["outer", "inner", "product"] as const).reduce(
    (acc, key) => ({
      passed: acc.passed + (layers[key]?.pass_count ?? 0),
      failed: acc.failed + (layers[key]?.fail_count ?? 0),
    }),
    { passed: 0, failed: 0 },
  );
}

function relationshipScanFromInspection(
  inspection: Inspection,
): InspectionRelationshipScan {
  const checks = checklistTotals(inspection);
  return {
    inspectionId: inspection.id,
    scannedAt: inspection.created_at,
    personId: inspection.inspector_id,
    personName: inspection.inspector_name,
    deviceUuid: inspection.device_uuid,
    deviceFingerprint: inspection.device_fingerprint,
    reviewStatus: inspection.review_status,
    plantCode: inspection.plant_code,
    warehouseCode: inspection.warehouse_code,
    passedChecks: checks.passed,
    failedChecks: checks.failed,
  };
}

/**
 * Uses `inbound_inspection_uuid` / `outbound_inspection_uuid` from detail — at most two
 * extra detail calls, never the paginated list API.
 */
export async function getInspectionRelationship(
  uuid: string,
  opts?: { signal?: AbortSignal; current?: Inspection },
): Promise<InspectionRelationship | null> {
  const current = opts?.current ?? (await getInspectionById(uuid, opts));
  if (!current) return null;

  const resolveLinked = async (
    linkedUuid: string | null | undefined,
  ): Promise<Inspection | null> => {
    const linked = linkedUuid?.trim();
    if (!linked) return null;
    if (linked === current.id) return current;
    return getInspectionById(linked, opts);
  };

  let inboundInspection: Inspection | null = null;
  let outboundInspection: Inspection | null = null;

  if (current.inspection_type === "inbound") {
    inboundInspection = current;
    outboundInspection = await resolveLinked(current.outbound_inspection_uuid);
  } else {
    outboundInspection = current;
    inboundInspection = await resolveLinked(current.inbound_inspection_uuid);
  }

  if (!inboundInspection) {
    inboundInspection = await resolveLinked(current.inbound_inspection_uuid);
  }

  if (!outboundInspection) {
    outboundInspection = await resolveLinked(current.outbound_inspection_uuid);
  }

  if (!inboundInspection && !outboundInspection) return null;

  return {
    inbound: inboundInspection
      ? relationshipScanFromInspection(inboundInspection)
      : null,
    outbound: outboundInspection
      ? relationshipScanFromInspection(outboundInspection)
      : null,
  };
}

/** @deprecated Use server table + `fetchInspectionsPage` on admin device view. */
export async function getInspectionsByDeviceFingerprint(
  fingerprint: string,
): Promise<Inspection[]> {
  const fp = fingerprint.trim();
  if (!fp) return [];
  const rows = await fetchAllInspectionRows({ search: fp });
  return rows.filter((i) => i.device_fingerprint === fp);
}

/** @deprecated Use server table + `fetchInspectionsPage` on admin device view. */
export async function getInspectionsByDeviceId(
  numericDeviceId: string,
): Promise<Inspection[]> {
  const needle = numericDeviceId.trim();
  if (!needle) return [];
  const rows = await fetchAllInspectionRows({ search: needle });
  return rows.filter((i) => i.device_id === needle);
}

/** @deprecated Use server table + `fetchInspectionsPage` on admin user view. */
export async function getInspectionsByUserId(
  userId: number,
): Promise<Inspection[]> {
  const rows = await fetchAllInspectionRows({});
  return rows.filter((i) => i.inspector_id === userId);
}

export async function getInspectionKpis(
  dateFrom?: string,
  dateTo?: string,
  opts?: { signal?: AbortSignal },
): Promise<InspectionKpis> {
  return fetchInspectionKpis(
    {
      date_from: isoToApiDate(dateFrom) ?? null,
      date_to: isoToApiDate(dateTo) ?? null,
    },
    opts,
  );
}

export async function getInspectionKpisForDateRange(
  range: DateRange | undefined,
  opts?: { signal?: AbortSignal; filtersValue?: MultiSelectFiltersValue },
): Promise<InspectionKpis> {
  return fetchInspectionKpis(
    buildInspectionKpisApiParams({
      dateRange: range,
      filtersValue: opts?.filtersValue,
    }),
    opts,
  );
}

/**
 * Inspections awaiting manager sign-off — loads every page.
 * Prefer `useOpsInspectionsPagedList` with `inspectionIsPendingManagerReview`.
 */
export async function getInspectionsPendingManagerReview(opts?: {
  signal?: AbortSignal;
}): Promise<Inspection[]> {
  const rows = await fetchAllInspectionRows(
    {
      sort_by: "created_at",
      sort_dir: "desc",
    },
    opts,
  );
  return rows.filter(inspectionIsPendingManagerReview);
}
