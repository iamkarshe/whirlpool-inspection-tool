import { isAxiosError } from "axios";

import { getInspections as getInspectionsApi } from "@/api/generated/inspections/inspections";
import type { InspectionFullResponse } from "@/api/generated/model/inspectionFullResponse";
import type { GetInspectionKpisApiInspectionsKpisGetParams } from "@/api/generated/model/getInspectionKpisApiInspectionsKpisGetParams";
import type { GetInspectionsApiInspectionsGetParams } from "@/api/generated/model/getInspectionsApiInspectionsGetParams";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { ChecklistItemResponse } from "@/api/generated/model/checklistItemResponse";
import type { InspectionInputItemResponse } from "@/api/generated/model/inspectionInputItemResponse";
import type { InspectionListItemResponse } from "@/api/generated/model/inspectionListItemResponse";
import type { InspectionPassFailCounts } from "@/api/generated/model/inspectionPassFailCounts";
import type { InspectionListResponse } from "@/api/generated/model/inspectionListResponse";
import type { InspectionKpisResponse } from "@/api/generated/model/inspectionKpisResponse";
import type { InspectionReviewStatusUpdateRequest } from "@/api/generated/model/inspectionReviewStatusUpdateRequest";
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

function normalizeInspectionType(
  raw: string | null | undefined,
): InspectionType {
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
    is_under_review: deriveIsUnderReviewFromReviewStatus(
      row.review_status ?? "",
    ),
    checklist_quality: checklistQualityFromListItem(row),
    warehouse_code: row.warehouse_code ?? undefined,
    plant_code: row.plant_code ?? undefined,
    checklist_layers: {
      outer: row.outer,
      inner: row.inner,
      product: row.product_checklist,
    },
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
    product_serial:
      full.product?.material_code?.trim() || full.product_material_code,
    product_category_name: full.product?.product_category_name ?? undefined,
    product_description: full.product?.material_description ?? null,
    product_barcode: full.product?.barcode ?? null,
    inspection_serial_number:
      full.product?.inspection_serial_number ?? null,
    checklist_id: full.inputs?.[0]?.checklist_id ?? 0,
    checklist_name: "",
    inspection_type: normalizeInspectionType(full.inspection_type),
    created_at: full.created_at,
    review_status: full.review_status,
    is_under_review: full.is_under_review,
    checklist_quality: cq,
    warehouse_code: full.warehouse_code ?? undefined,
    plant_code: full.plant_code ?? undefined,
    reviewer_name: full.reviewer_name ?? null,
    reviewed_at: full.reviewed_at ?? null,
    reviewed_comment: full.reviewed_comment ?? null,
  };
}

type InspectionKpisResponseWithLegacy = InspectionKpisResponse & {
  inbound_passed?: number;
  inbound_failed?: number;
  outbound_passed?: number;
  outbound_failed?: number;
};

export function mapKpisResponse(api: InspectionKpisResponse): InspectionKpis {
  const ext = api as InspectionKpisResponseWithLegacy;
  const inboundApproved = api.inbound_approved ?? ext.inbound_passed ?? 0;
  const outboundApproved = api.outbound_approved ?? ext.outbound_passed ?? 0;

  return {
    totalInspections: api.total_inspections,
    inboundInReview: api.inbound_in_review ?? 0,
    inboundRejected: api.inbound_rejected ?? 0,
    inboundApproved,
    outboundInReview: api.outbound_in_review ?? 0,
    outboundRejected: api.outbound_rejected ?? 0,
    outboundApproved,
    inboundPassed: ext.inbound_passed ?? 0,
    inboundFailed: ext.inbound_failed ?? 0,
    outboundPassed: ext.outbound_passed ?? 0,
    outboundFailed: ext.outbound_failed ?? 0,
    periodFrom: api.date_from,
    periodTo: api.date_to,
    analytics: api.analytics
      ? {
          scansTotal: api.analytics.scans_total ?? 0,
          scansInReview: api.analytics.scans_in_review ?? 0,
          scansApproved: api.analytics.scans_approved ?? 0,
          scansRejected: api.analytics.scans_rejected ?? 0,
        }
      : undefined,
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

function inspectionsApiObjectDetailMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("detail" in data)) {
    return null;
  }
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") {
    const s = detail.trim();
    return s.length > 0 ? s : null;
  }
  if (Array.isArray(detail)) return null;
  if (typeof detail !== "object" || detail === null) return null;
  const o = detail as Record<string, unknown>;
  const msg = o.message;
  if (typeof msg !== "string" || !msg.trim()) return null;
  const lines = [msg.trim()];
  if (typeof o.distance_km === "number" && typeof o.max_km === "number") {
    const dist =
      Math.abs(o.distance_km) >= 100
        ? Math.round(o.distance_km)
        : Math.round(o.distance_km * 10) / 10;
    lines.push(
      `Reported distance from the warehouse: about ${dist} km (maximum allowed: ${o.max_km} km).`,
    );
  }
  return lines.join("\n\n");
}

function inspectionsApiValidationDetailMessages(err: unknown): string[] {
  if (!isAxiosError(err)) return [];
  const data = err.response?.data as unknown;
  if (
    typeof data !== "object" ||
    data === null ||
    !("detail" in data) ||
    !Array.isArray((data as HTTPValidationError).detail)
  ) {
    return [];
  }
  const detail = (data as HTTPValidationError).detail!;
  return detail
    .map((d) => {
      const raw = typeof d?.msg === "string" ? d.msg : "";
      return raw.replace(/^Value error,\s*/i, "").trim();
    })
    .filter((m) => m.length > 0);
}

/**
 * Prefer FastAPI `detail[]` messages for dialogs; otherwise fall back to a single line.
 */
export function inspectionsApiValidationDialogContent(
  err: unknown,
  mode: "inbound" | "outbound",
  fallbackMessage: string,
): { title: string; message: string } {
  const directionLabel = mode === "inbound" ? "Inbound" : "Outbound";
  const title = `Could not upload ${directionLabel} Inspection`;
  if (isAxiosError(err)) {
    const objectMsg = inspectionsApiObjectDetailMessage(err.response?.data);
    if (objectMsg) {
      return {
        title,
        message: objectMsg,
      };
    }
  }
  const msgs = inspectionsApiValidationDetailMessages(err);
  if (msgs.length > 0) {
    return {
      title,
      message: msgs.join("\n\n"),
    };
  }
  return {
    title,
    message: inspectionsApiErrorMessage(err, fallbackMessage),
  };
}

export function inspectionsApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (!isAxiosError(err)) return err instanceof Error ? err.message : fallback;
  const data = err.response?.data as unknown;
  const objectMsg = inspectionsApiObjectDetailMessage(data);
  if (objectMsg) return objectMsg;
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
  if (typeof err.message === "string" && err.message.length > 0)
    return err.message;
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

export function invalidateInspectionDetailCache(inspectionUuid: string): void {
  detailFlight.delete(inspectionUuid.trim());
}

export async function patchInspectionReviewStatus(
  inspectionUuid: string,
  body: InspectionReviewStatusUpdateRequest,
  opts?: { signal?: AbortSignal },
): Promise<InspectionFullResponse> {
  const api = getInspectionsApi();
  const res =
    await api.patchInspectionReviewStatusApiInspectionsInspectionUuidReviewStatusPatch(
      inspectionUuid.trim(),
      body,
      opts?.signal ? { signal: opts.signal } : undefined,
    );
  invalidateInspectionDetailCache(inspectionUuid);
  return res;
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
  checklist: Pick<ChecklistItemResponse, "group_name" | "section">,
): boolean {
  const g = (checklist.group_name ?? "").toLowerCase().trim();
  const sec = (checklist.section ?? "").toLowerCase().replace(/_/g, " ").trim();

  if (g.length > 0) {
    switch (inspectionSection) {
      case "outer-packaging":
        return g.includes("outer");
      case "inner-packaging":
        return g.includes("inner");
      case "product":
        return (
          g.includes("product") && !g.includes("outer") && !g.includes("inner")
        );
      case "device":
        return g.includes("device");
      default:
        return false;
    }
  }

  const s = sec;
  switch (inspectionSection) {
    case "outer-packaging":
      return s.includes("outer");
    case "inner-packaging":
      return s.includes("inner");
    case "product":
      return (
        s.includes("product") && !s.includes("outer") && !s.includes("inner")
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
      !apiSectionMatches(inspectionSection, input.checklist)
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
