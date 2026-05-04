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
  InspectionSectionKey,
} from "@/pages/dashboard/inspections/inspection-types";
import type { DateRange } from "react-day-picker";

import {
  fetchAllInspectionRows,
  fetchInspectionDetail,
  fetchInspectionInputsAsQuestionRows,
  fetchInspectionKpis,
  formatCalendarDateForApi,
  inspectionKpisParamsFromDateRange,
  isoToApiDate,
  mapInspectionFullToInspection,
} from "@/services/inspections-api";

export async function getInspectionQuestionResults(
  inspectionUuid: string,
  section: InspectionSectionKey,
): Promise<InspectionQuestionResult[]> {
  return fetchInspectionInputsAsQuestionRows(inspectionUuid, section);
}

export async function getInspections(): Promise<Inspection[]> {
  return fetchAllInspectionRows({
    sort_by: "created_at",
    sort_dir: "desc",
  });
}

/** Ops inspection list: filter by `created_at` and optional inbound/outbound. */
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
): Promise<Inspection | null> {
  if (!id?.trim()) return null;
  try {
    const full = await fetchInspectionDetail(id.trim());
    return mapInspectionFullToInspection(full);
  } catch {
    return null;
  }
}

export async function getInspectionRelationship(
  uuid: string,
): Promise<InspectionRelationship | null> {
  const current = await getInspectionById(uuid);
  if (!current) return null;
  const all = await fetchAllInspectionRows({});
  const related = all.filter(
    (i) => i.product_serial === current.product_serial,
  );
  if (!related.length) return null;

  const inboundInspection =
    related.find((i) => i.inspection_type === "inbound") ?? current;
  const outboundInspection =
    related.find(
      (i) => i.inspection_type === "outbound" && i.id !== inboundInspection.id,
    ) ?? null;

  const scan = (i: Inspection) => ({
    inspectionId: i.id,
    scannedAt: i.created_at,
    personId: i.inspector_id,
    personName: i.inspector_name,
    deviceUuid: i.device_uuid,
    deviceFingerprint: i.device_fingerprint,
  });

  return {
    inbound: scan(inboundInspection),
    outbound: outboundInspection ? scan(outboundInspection) : null,
  };
}

export async function getInspectionsByDeviceFingerprint(
  fingerprint: string,
): Promise<Inspection[]> {
  const fp = fingerprint.trim();
  if (!fp) return [];
  const rows = await fetchAllInspectionRows({});
  return rows.filter((i) => i.device_fingerprint === fp);
}

export async function getInspectionsByDeviceId(
  numericDeviceId: string,
): Promise<Inspection[]> {
  const needle = numericDeviceId.trim();
  if (!needle) return [];
  const rows = await fetchAllInspectionRows({});
  return rows.filter((i) => i.device_id === needle);
}

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
  opts?: { signal?: AbortSignal },
): Promise<InspectionKpis> {
  return fetchInspectionKpis(
    inspectionKpisParamsFromDateRange({
      from: range?.from,
      to: range?.to,
    }),
    opts,
  );
}

/** Inspections awaiting manager sign-off (paginated list, then `is_under_review`). */
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
  return rows.filter((i) => i.is_under_review);
}
