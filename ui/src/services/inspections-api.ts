import { isAxiosError } from "axios";

import { getInspections as getInspectionsApi } from "@/api/generated/inspections/inspections";
import type { InspectionFullResponse } from "@/api/generated/model/inspectionFullResponse";
import type { GetInspectionKpisApiInspectionsKpisGetParams } from "@/api/generated/model/getInspectionKpisApiInspectionsKpisGetParams";
import type { GetInspectionsApiInspectionsGetParams } from "@/api/generated/model/getInspectionsApiInspectionsGetParams";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { InspectionInputItemResponse } from "@/api/generated/model/inspectionInputItemResponse";
import type { InspectionListItemResponse } from "@/api/generated/model/inspectionListItemResponse";
import type { InspectionPassFailCounts } from "@/api/generated/model/inspectionPassFailCounts";
import type { InspectionListResponse } from "@/api/generated/model/inspectionListResponse";
import type { InspectionKpisResponse } from "@/api/generated/model/inspectionKpisResponse";
import type {
  Inspection,
  InspectionKpis,
  InspectionQuestionResult,
  InspectionQuestionStatus,
  InspectionSectionKey,
  InspectionType,
} from "@/pages/dashboard/inspections/inspection-types";

const MAX_PAGES = 200;

export type InspectionsPageParams = Pick<
  GetInspectionsApiInspectionsGetParams,
  | "page"
  | "per_page"
  | "search"
  | "sort_by"
  | "sort_dir"
  | "inspection_type"
  | "warehouse_uuid"
  | "plant_uuid"
  | "date_field"
  | "date_from"
  | "date_to"
  | "is_active"
>;

function layerFailed(layer: InspectionPassFailCounts): boolean {
  return (layer.fail_count ?? 0) > 0;
}

function checklistQualityFromListItem(
  row: InspectionListItemResponse,
): InspectionQuestionStatus {
  return [row.outer, row.inner, row.product_checklist].some(layerFailed)
    ? "fail"
    : "pass";
}

export function deriveIsUnderReviewFromReviewStatus(status: string): boolean {
  const s = status.toLowerCase().trim();
  if (!s) return false;
  if (/(approv|reject|complete)/.test(s)) return false;
  return (
    s.includes("pending") ||
    s.includes("review") ||
    s.includes("queued") ||
    s === "submitted"
  );
}

function normalizeInspectionType(raw: string | null | undefined): InspectionType {
  const t = (raw ?? "").toLowerCase().trim();
  return t.includes("outbound") ? "outbound" : "inbound";
}

export function mapInspectionListItemToInspection(
  row: InspectionListItemResponse,
): Inspection {
  return {
    id: row.uuid,
    inspector_id: row.inspector_id,
    inspector_name: row.inspector_name,
    device_id: String(row.device_id),
    device_fingerprint: row.device_fingerprint,
    product_id: row.product_id,
    product_serial: row.product_material_code,
    checklist_id: 0,
    checklist_name: "",
    inspection_type: normalizeInspectionType(row.inspection_type),
    created_at: row.created_at,
    review_status: row.review_status,
    is_under_review: deriveIsUnderReviewFromReviewStatus(row.review_status ?? ""),
    checklist_quality: checklistQualityFromListItem(row),
    warehouse_code: row.warehouse_code ?? undefined,
    plant_code: row.plant_code ?? undefined,
  };
}

export function mapInspectionFullToInspection(
  full: InspectionFullResponse,
): Inspection {
  const cq: InspectionQuestionStatus =
    full.checklist_fail_total > 0 ? "fail" : "pass";
  return {
    id: full.uuid,
    inspector_id: full.inspector_id,
    inspector_name: full.inspector_name,
    device_id: String(full.device_id),
    device_fingerprint: full.device_fingerprint,
    product_id: full.product_id,
    product_serial: full.product_material_code,
    checklist_id: full.inputs?.[0]?.checklist_id ?? 0,
    checklist_name: "",
    inspection_type: normalizeInspectionType(full.inspection_type),
    created_at: full.created_at,
    review_status: full.review_status,
    is_under_review: full.is_under_review,
    checklist_quality: cq,
    warehouse_code: full.warehouse_code ?? undefined,
    plant_code: full.plant_code ?? undefined,
  };
}

export function mapKpisResponse(api: InspectionKpisResponse): InspectionKpis {
  const inboundApproved = api.inbound_approved ?? api.inbound_passed;
  const outboundApproved = api.outbound_approved ?? api.outbound_passed;

  return {
    totalInspections: api.total_inspections,
    inboundInReview: api.inbound_in_review ?? 0,
    inboundRejected: api.inbound_rejected ?? 0,
    inboundApproved,
    outboundInReview: api.outbound_in_review ?? 0,
    outboundRejected: api.outbound_rejected ?? 0,
    outboundApproved,
    inboundPassed: api.inbound_passed,
    inboundFailed: api.inbound_failed,
    outboundPassed: api.outbound_passed,
    outboundFailed: api.outbound_failed,
    periodFrom: api.date_from,
    periodTo: api.date_to,
  };
}

export function formatCalendarDateForApi(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function inspectionKpisParamsFromDateRange(range: {
  from?: Date;
  to?: Date;
}): GetInspectionKpisApiInspectionsKpisGetParams {
  if (!range.from) return {};
  const end = range.to ?? range.from;
  return {
    date_from: formatCalendarDateForApi(range.from),
    date_to: formatCalendarDateForApi(end),
  };
}

export function inspectionsApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (!isAxiosError(err))
    return err instanceof Error ? err.message : fallback;
  const data = err.response?.data as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    Array.isArray((data as HTTPValidationError).detail)
  ) {
    const detail = (data as HTTPValidationError).detail!;
    const first = detail[0]?.msg ?? detail[0]?.type;
    if (typeof first === "string" && first.length > 0) return first;
  }
  if (typeof err.response?.status === "number") {
    return `${fallback} (HTTP ${err.response.status}).`;
  }
  if (typeof err.message === "string" && err.message.length > 0) return err.message;
  return fallback;
}

export async function fetchInspectionsPage(
  params: InspectionsPageParams,
  opts?: { signal?: AbortSignal },
): Promise<{ data: Inspection[]; total: number }> {
  const api = getInspectionsApi();
  const res: InspectionListResponse = await api.getInspectionsApiInspectionsGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? 100,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "created_at",
      sort_dir: params.sort_dir ?? "desc",
      inspection_type: params.inspection_type ?? null,
      warehouse_uuid: params.warehouse_uuid ?? null,
      plant_uuid: params.plant_uuid ?? null,
      date_field: params.date_field ?? null,
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      is_active: params.is_active,
    },
    opts?.signal ? { signal: opts.signal } : undefined,
  );
  return {
    data: res.data.map(mapInspectionListItemToInspection),
    total: res.total,
  };
}

export async function fetchAllInspectionRows(
  base: Omit<InspectionsPageParams, "page" | "per_page">,
  opts?: { signal?: AbortSignal },
): Promise<Inspection[]> {
  const pageSize = 100;
  let page = 1;
  const out: Inspection[] = [];
  let total = Number.POSITIVE_INFINITY;
  while (out.length < total && page <= MAX_PAGES) {
    const { data, total: t } = await fetchInspectionsPage(
      { ...base, page, per_page: pageSize },
      opts,
    );
    total = t;
    out.push(...data);
    if (data.length < pageSize) break;
    page += 1;
  }
  return out;
}

export function isoToApiDate(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export async function fetchInspectionKpis(
  params?: GetInspectionKpisApiInspectionsKpisGetParams,
  opts?: { signal?: AbortSignal },
): Promise<InspectionKpis> {
  const api = getInspectionsApi();
  const res = await api.getInspectionKpisApiInspectionsKpisGet(
    params ?? {},
    opts?.signal ? { signal: opts.signal } : undefined,
  );
  return mapKpisResponse(res);
}

const detailFlight = new Map<string, Promise<InspectionFullResponse>>();

export async function fetchInspectionDetail(
  inspectionUuid: string,
  opts?: { signal?: AbortSignal },
): Promise<InspectionFullResponse> {
  if (!detailFlight.has(inspectionUuid)) {
    const api = getInspectionsApi();
    const p = api
      .getInspectionDetailApiInspectionsInspectionUuidGet(
        inspectionUuid,
        opts?.signal ? { signal: opts.signal } : undefined,
      )
      .finally(() => {
        detailFlight.delete(inspectionUuid);
      });
    detailFlight.set(inspectionUuid, p);
  }
  return detailFlight.get(inspectionUuid)!;
}

function valueToQuestionStatus(raw: string): InspectionQuestionStatus {
  const v = raw.trim().toLowerCase();
  if (
    v === "fail" ||
    v === "failed" ||
    v === "no" ||
    v === "n" ||
    v === "false"
  )
    return "fail";
  if (
    v === "pass" ||
    v === "passed" ||
    v === "ok" ||
    v === "yes" ||
    v === "y" ||
    v === "true"
  )
    return "pass";
  return /fail/.test(v) ? "fail" : "pass";
}

function apiSectionMatches(
  inspectionSection: InspectionSectionKey,
  checklistSection: string,
): boolean {
  const s = checklistSection.toLowerCase().replace(/_/g, " ");
  switch (inspectionSection) {
    case "outer-packaging":
      return s.includes("outer");
    case "inner-packaging":
      return s.includes("inner");
    case "product":
      return (
        s.includes("product") &&
        !s.includes("outer") &&
        !s.includes("inner")
      );
    case "device":
      return s.includes("device");
    default:
      return false;
  }
}

export async function fetchInspectionInputsAsQuestionRows(
  inspectionUuid: string,
  inspectionSection: InspectionSectionKey,
  opts?: { signal?: AbortSignal },
): Promise<InspectionQuestionResult[]> {
  const detail = await fetchInspectionDetail(inspectionUuid, opts);
  return mapInputsForSection(detail.inputs ?? [], inspectionSection);
}

export function mapInputsForSection(
  inputs: InspectionInputItemResponse[],
  inspectionSection: InspectionSectionKey,
): InspectionQuestionResult[] {
  const rows: InspectionQuestionResult[] = [];
  for (const input of inputs) {
    if (
      input.is_active === false ||
      !apiSectionMatches(inspectionSection, input.checklist.section)
    ) {
      continue;
    }
    const images = (input.image_urls ?? []).filter(Boolean).map((url) => ({
      url,
      filename: url.split("/").pop(),
    }));
    rows.push({
      id: input.uuid ?? String(input.id),
      section: inspectionSection,
      question: input.checklist.item_text,
      status: valueToQuestionStatus(input.value ?? ""),
      notes: input.remarks?.trim() || undefined,
      images,
    });
  }
  return rows.sort((a, b) => a.question.localeCompare(b.question));
}
