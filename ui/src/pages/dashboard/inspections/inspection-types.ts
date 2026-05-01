export type InspectionType = "inbound" | "outbound";

export type InspectionQuestionStatus = "pass" | "fail";

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
  checklist_id: number;
  checklist_name: string;
  inspection_type: InspectionType;
  created_at: string;
  review_status?: string;
  is_under_review?: boolean;
  checklist_quality?: InspectionQuestionStatus;
  warehouse_code?: string;
  plant_code?: string;
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
}
