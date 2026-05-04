import { getInspections } from "@/api/generated/inspections/inspections";
import { BodyUploadInspectionImageApiInspectionsUploadImagePostDirection } from "@/api/generated/model/bodyUploadInspectionImageApiInspectionsUploadImagePostDirection";
import type { ActiveChecklistGroupedResponse } from "@/api/generated/model/activeChecklistGroupedResponse";
import type { BarcodeLockAcquireRequest } from "@/api/generated/model/barcodeLockAcquireRequest";
import type { BarcodeLockReleaseResponse } from "@/api/generated/model/barcodeLockReleaseResponse";
import type { BarcodeLockResponse } from "@/api/generated/model/barcodeLockResponse";
import type { BarcodeParseResponse } from "@/api/generated/model/barcodeParseResponse";
import type { ChecklistGroupBlock } from "@/api/generated/model/checklistGroupBlock";
import type { GetInspectionKpisManagerApiInspectionsKpisManagerGetParams } from "@/api/generated/model/getInspectionKpisManagerApiInspectionsKpisManagerGetParams";
import type { GetInspectionKpisOperatorApiInspectionsKpisOperatorGetParams } from "@/api/generated/model/getInspectionKpisOperatorApiInspectionsKpisOperatorGetParams";
import type { InspectionMetadataResponse } from "@/api/generated/model/inspectionMetadataResponse";
import type { InspectionWithChecklistPayload } from "@/api/generated/model/inspectionWithChecklistPayload";
import type { ManagerInspectionTeamKpisResponse } from "@/api/generated/model/managerInspectionTeamKpisResponse";
import type { OperatorInspectionKpisResponse } from "@/api/generated/model/operatorInspectionKpisResponse";
import type { StartInboundInspectionRequest } from "@/api/generated/model/startInboundInspectionRequest";
import type { StartOutboundInspectionRequest } from "@/api/generated/model/startOutboundInspectionRequest";

import type { InspectionStartMode } from "@/pages/ops/new-inspection/inspection-start-shared";
import { WHIRLPOOL_SESSION_CHANGED_EVENT } from "@/lib/session-events";
import { inspectionsApiErrorMessage } from "@/services/inspections-api";

const OPS_FORM_CONFIG_TTL_MS = 12 * 60 * 60 * 1000;

export type OpsInspectionFormConfigBundle = {
  metadata: InspectionMetadataResponse;
  checklistGroups: ChecklistGroupBlock[];
};

let formConfigCache: OpsInspectionFormConfigBundle | null = null;
let formConfigCachedAt = 0;
/** Token snapshot when `formConfigCache` was written; must match current session to reuse. */
let formConfigCacheToken: string | null = null;
let formConfigInFlight: Promise<OpsInspectionFormConfigBundle> | null = null;

function opsAuthTokenSnapshot(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("whirlpool.access_token")?.trim() ?? "";
}

/** Drop cached metadata + checklist (login, logout, or manual refresh). */
export function invalidateOpsInspectionFormConfigCache(): void {
  formConfigCache = null;
  formConfigCachedAt = 0;
  formConfigCacheToken = null;
  formConfigInFlight = null;
}

let sessionListenerAttached = false;
function attachOpsInspectionFormConfigSessionListener() {
  if (typeof window === "undefined" || sessionListenerAttached) return;
  sessionListenerAttached = true;
  window.addEventListener(WHIRLPOOL_SESSION_CHANGED_EVENT, () => {
    invalidateOpsInspectionFormConfigCache();
  });
}

attachOpsInspectionFormConfigSessionListener();

export async function parseInspectionBarcode(
  barcode: string,
  opts?: { signal?: AbortSignal },
): Promise<BarcodeParseResponse> {
  const api = getInspections();
  return api.parseInspectionBarcodeApiInspectionsParseBarcodeGet(
    { barcode },
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function acquireOpsInspectionBarcodeLock(
  body: BarcodeLockAcquireRequest,
  opts?: { signal?: AbortSignal },
): Promise<BarcodeLockResponse> {
  const api = getInspections();
  return api.acquireInspectionBarcodeLockApiInspectionsBarcodeLockPost(
    body,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function releaseOpsInspectionBarcodeLock(
  body: BarcodeLockAcquireRequest,
  opts?: { signal?: AbortSignal },
): Promise<BarcodeLockReleaseResponse> {
  const api = getInspections();
  return api.releaseInspectionBarcodeLockApiInspectionsBarcodeLockReleasePost(
    body,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function fetchActiveInspectionChecklist(
  opts?: { signal?: AbortSignal },
): Promise<ActiveChecklistGroupedResponse> {
  const api = getInspections();
  return api.getActiveInspectionChecklistApiInspectionsChecklistGet(
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function fetchInspectionMetadataForOps(
  opts?: { signal?: AbortSignal },
): Promise<InspectionMetadataResponse> {
  const api = getInspections();
  return api.getInspectionMetadataApiInspectionsMetadataGet(
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

/**
 * Loads inspection metadata + active checklist together, with:
 * - **Single-flight**: concurrent callers share one network round-trip (e.g. React Strict Mode).
 * - **Session + TTL cache**: reused until `WHIRLPOOL_SESSION_CHANGED_EVENT` (login/logout) or **12h** elapsed.
 */
export async function loadOpsInspectionFormConfig(
  opts?: { signal?: AbortSignal },
): Promise<OpsInspectionFormConfigBundle> {
  const token = opsAuthTokenSnapshot();
  const now = Date.now();

  if (!token) {
    const [metadata, chk] = await Promise.all([
      fetchInspectionMetadataForOps(opts),
      fetchActiveInspectionChecklist(opts),
    ]);
    return { metadata, checklistGroups: chk.groups ?? [] };
  }

  if (
    formConfigCache &&
    formConfigCacheToken === token &&
    now - formConfigCachedAt < OPS_FORM_CONFIG_TTL_MS
  ) {
    return formConfigCache;
  }

  if (!formConfigInFlight) {
    formConfigInFlight = Promise.all([
      fetchInspectionMetadataForOps(opts),
      fetchActiveInspectionChecklist(opts),
    ])
      .then(([metadata, chk]) => {
        const bundle: OpsInspectionFormConfigBundle = {
          metadata,
          checklistGroups: chk.groups ?? [],
        };
        const t = opsAuthTokenSnapshot();
        if (t === token) {
          formConfigCache = bundle;
          formConfigCachedAt = Date.now();
          formConfigCacheToken = token;
        }
        return bundle;
      })
      .finally(() => {
        formConfigInFlight = null;
      });
  }

  return formConfigInFlight;
}

export async function startOpsInboundInspection(
  body: StartInboundInspectionRequest,
  opts?: { signal?: AbortSignal },
): Promise<InspectionWithChecklistPayload> {
  const api = getInspections();
  return api.startInboundInspectionApiInspectionsInboundPost(
    body,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function startOpsOutboundInspection(
  body: StartOutboundInspectionRequest,
  opts?: { signal?: AbortSignal },
): Promise<InspectionWithChecklistPayload> {
  const api = getInspections();
  return api.startOutboundInspectionApiInspectionsOutboundPost(
    body,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

/**
 * Manager team KPIs (`GET /api/inspections/kpis/manager`): one response for
 * all-inspection totals plus inbound/outbound review and outcome splits.
 */
export async function fetchManagerTeamInspectionKpis(
  params?: GetInspectionKpisManagerApiInspectionsKpisManagerGetParams,
  opts?: { signal?: AbortSignal },
): Promise<ManagerInspectionTeamKpisResponse> {
  const api = getInspections();
  return api.getInspectionKpisManagerApiInspectionsKpisManagerGet(
    params ?? { period: "today" },
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

/**
 * Operator inspection KPIs (`GET /api/inspections/kpis/operator`): one response for
 * the reporting window — inbound/outbound splits plus combined `review_queue`.
 */
export async function fetchOperatorInspectionKpis(
  params?: GetInspectionKpisOperatorApiInspectionsKpisOperatorGetParams,
  opts?: { signal?: AbortSignal },
): Promise<OperatorInspectionKpisResponse> {
  const api = getInspections();
  return api.getInspectionKpisOperatorApiInspectionsKpisOperatorGet(
    params ?? { period: "today" },
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function uploadOpsInspectionImage(
  params: { barcode: string; mode: InspectionStartMode; file: File },
  opts?: { signal?: AbortSignal },
): Promise<{ path: string }> {
  const api = getInspections();
  const direction =
    params.mode === "inbound" ?
      BodyUploadInspectionImageApiInspectionsUploadImagePostDirection.inbound
    : BodyUploadInspectionImageApiInspectionsUploadImagePostDirection.outbound;
  return api.uploadInspectionImageApiInspectionsUploadImagePost(
    {
      barcode: params.barcode,
      direction,
      file: params.file,
    },
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export function opsInspectionApiError(err: unknown, fallback: string): string {
  return inspectionsApiErrorMessage(err, fallback);
}
