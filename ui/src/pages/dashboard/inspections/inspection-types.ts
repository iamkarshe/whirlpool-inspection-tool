export type InspectionType = "inbound" | "outbound";

export type InspectionQuestionStatus = "pass" | "fail";

/** Outer / Inner / Product counts from inspection list API (`InspectionListItemResponse`). */
export type InspectionChecklistLayerCounts = {
  pass_count: number;
  fail_count: number;
};

export interface Inspection {
  id: string;
  inspector_id: number;
  inspector_name: string;
  device_id: string;
  device_fingerprint: string;
  product_id: number;
  product_serial: string;
  product_category_id?: number;
  product_category_name?: string;
  /** From detail `product.material_description` (model / variant line on the slip). */
  product_description?: string | null;
  /** From inspection detail `product.barcode` when present. */
  product_barcode?: string | null;
  /** From inspection detail `product.inspection_serial_number` (unit serial suffix). */
  inspection_serial_number?: string | null;
  checklist_id: number;
  checklist_name: string;
  inspection_type: InspectionType;
  created_at: string;
  review_status?: string;
  is_under_review?: boolean;
  /** Manager quality review (from inspection detail API when present). */
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  reviewed_comment?: string | null;
  checklist_quality?: InspectionQuestionStatus;
  warehouse_code?: string;
  plant_code?: string;
  /** Present when sourced from GET /api/inspections list payload. */
  checklist_layers?: {
    outer: InspectionChecklistLayerCounts;
    inner: InspectionChecklistLayerCounts;
    product: InspectionChecklistLayerCounts;
  };
}

export type InspectionSectionKey =
  | "outer-packaging"
  | "inner-packaging"
  | "product"
  | "device";

export type InspectionImage = {
  url: string;
  filename?: string;
};

export type InspectionQuestionResult = {
  id: string;
  section: InspectionSectionKey;
  question: string;
  status: InspectionQuestionStatus;
  notes?: string;
  images: InspectionImage[];
};

export type InspectionRelationshipScan = {
  inspectionId: string;
  scannedAt: string;
  personId: number;
  personName: string;
  deviceId: string;
  deviceFingerprint: string;
};

export type InspectionRelationship = {
  inbound: InspectionRelationshipScan;
  outbound: InspectionRelationshipScan | null;
};

/** Mirrors `InspectionAnalyticsKpis` from `/api/inspections/kpis`. */
export type InspectionKpisAnalytics = {
  scansTotal: number;
  scansInReview: number;
  scansApproved: number;
  scansRejected: number;
};

export interface InspectionKpis {
  totalInspections: number;
  /** Quality-review lane counts from `/api/inspections/kpis`. */
  inboundInReview: number;
  inboundRejected: number;
  inboundApproved: number;
  outboundInReview: number;
  outboundRejected: number;
  outboundApproved: number;
  /** Checklist pass/fail totals (legacy API fields; used e.g. Operations Analytics). */
  inboundPassed: number;
  inboundFailed: number;
  outboundPassed: number;
  outboundFailed: number;
  periodFrom?: string;
  periodTo?: string;
  /** Present when the API returns `analytics` on the KPI payload. */
  analytics?: InspectionKpisAnalytics;
}
