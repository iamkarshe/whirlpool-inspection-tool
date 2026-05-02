import { getInspections } from "@/api/generated/inspections/inspections";
import { BodyUploadInspectionImageApiInspectionsUploadImagePostDirection } from "@/api/generated/model/bodyUploadInspectionImageApiInspectionsUploadImagePostDirection";
import type { ActiveChecklistGroupedResponse } from "@/api/generated/model/activeChecklistGroupedResponse";
import type { BarcodeParseResponse } from "@/api/generated/model/barcodeParseResponse";
import type { InspectionMetadataResponse } from "@/api/generated/model/inspectionMetadataResponse";
import type { InspectionWithChecklistPayload } from "@/api/generated/model/inspectionWithChecklistPayload";
import type { StartInboundInspectionRequest } from "@/api/generated/model/startInboundInspectionRequest";
import type { StartOutboundInspectionRequest } from "@/api/generated/model/startOutboundInspectionRequest";

import type { InspectionStartMode } from "@/pages/ops/new-inspection/inspection-start-shared";
import { inspectionsApiErrorMessage } from "@/services/inspections-api";

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
