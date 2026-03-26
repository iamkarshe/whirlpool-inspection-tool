/**
 * Aligned with backend Inspection: id (UUID), inspector_id, device_id,
 * inspection_type, product_id, checklist_id, lat, lng, ip_address (+ mixin).
 * Display fields (inspector_name, device_fingerprint, product_serial, checklist_name)
 * are populated from joins / lookup.
 */
export type InspectionType = "inbound" | "outbound";

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
}

export type InspectionSectionKey =
  | "outer-packaging"
  | "inner-packaging"
  | "product"
  | "device";

export type InspectionQuestionStatus = "pass" | "fail";

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

function placeholderImageUrl(text: string) {
  const t = encodeURIComponent(text);
  return `https://placehold.co/1200x800?text=${t}`;
}

const inspectionQuestionResults: InspectionQuestionResult[] = [
  {
    id: "q-outer-1",
    section: "outer-packaging",
    question: "Carton intact (no dents / punctures)",
    status: "pass",
    images: [{ url: placeholderImageUrl("Outer carton"), filename: "outer-carton.jpg" }],
  },
  {
    id: "q-outer-2",
    section: "outer-packaging",
    question: "Shipping label present and readable",
    status: "pass",
    images: [{ url: placeholderImageUrl("Shipping label"), filename: "label.jpg" }],
  },
  {
    id: "q-outer-3",
    section: "outer-packaging",
    question: "Straps / seals intact",
    status: "fail",
    notes: "Seal partially torn on the right edge.",
    images: [
      { url: placeholderImageUrl("Seal issue - 1"), filename: "seal-1.jpg" },
      { url: placeholderImageUrl("Seal issue - 2"), filename: "seal-2.jpg" },
    ],
  },
  {
    id: "q-inner-1",
    section: "inner-packaging",
    question: "Foam inserts present",
    status: "pass",
    images: [{ url: placeholderImageUrl("Foam inserts"), filename: "foam.jpg" }],
  },
  {
    id: "q-inner-2",
    section: "inner-packaging",
    question: "Accessories bag present",
    status: "pass",
    images: [{ url: placeholderImageUrl("Accessories bag"), filename: "accessories.jpg" }],
  },
  {
    id: "q-inner-3",
    section: "inner-packaging",
    question: "Plastic wrap intact",
    status: "fail",
    notes: "Tear at the back panel.",
    images: [{ url: placeholderImageUrl("Wrap tear"), filename: "wrap.jpg" }],
  },
  {
    id: "q-prod-1",
    section: "product",
    question: "Control panel has no scratches",
    status: "pass",
    images: [{ url: placeholderImageUrl("Control panel"), filename: "panel.jpg" }],
  },
  {
    id: "q-prod-2",
    section: "product",
    question: "Drum rotates smoothly",
    status: "pass",
    images: [],
  },
  {
    id: "q-prod-3",
    section: "product",
    question: "Paint finish consistent",
    status: "fail",
    notes: "Minor scuff visible near bottom-left corner.",
    images: [{ url: placeholderImageUrl("Paint scuff"), filename: "scuff.jpg" }],
  },
  {
    id: "q-dev-1",
    section: "device",
    question: "Device time is synced",
    status: "pass",
    images: [],
  },
  {
    id: "q-dev-2",
    section: "device",
    question: "Camera focus is OK",
    status: "pass",
    images: [{ url: placeholderImageUrl("Camera test"), filename: "camera-test.jpg" }],
  },
];

export async function getInspectionQuestionResults(
  _inspectionId: string,
  section: InspectionSectionKey,
): Promise<InspectionQuestionResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(inspectionQuestionResults.filter((r) => r.section === section));
    }, 250);
  });
}

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
  total: number;
  totalChange: string;
  totalChangeType: "positive" | "negative";
  inbound: number;
  inboundChange: string;
  inboundChangeType: "positive" | "negative";
  outbound: number;
  outboundChange: string;
  outboundChangeType: "positive" | "negative";
  uniqueInspectors: number;
  inspectorsChange: string;
  inspectorsChangeType: "positive" | "negative";
}

const inspections: Inspection[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-111111111111",
    inspector_id: 1,
    inspector_name: "Amit Sharma",
    device_id: "550e8400-e29b-41d4-a716-446655440001",
    device_fingerprint: "fp-android-abc123",
    product_id: 1,
    product_serial: "WH-FL-2024-001234",
    product_category_id: 1,
    product_category_name: "Front Load Washing Machines",
    checklist_id: 1,
    checklist_name: "Front Load Pre-Dispatch",
    inspection_type: "outbound",
    created_at: "2024-03-01T10:30:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-222222222222",
    inspector_id: 2,
    inspector_name: "Priya Verma",
    device_id: "550e8400-e29b-41d4-a716-446655440002",
    device_fingerprint: "fp-android-def456",
    product_id: 2,
    product_serial: "WH-TL-2024-002456",
    product_category_id: 2,
    product_category_name: "Top Load Washing Machines",
    checklist_id: 1,
    checklist_name: "Front Load Pre-Dispatch",
    inspection_type: "inbound",
    created_at: "2024-03-02T14:00:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-333333333333",
    inspector_id: 1,
    inspector_name: "Amit Sharma",
    device_id: "550e8400-e29b-41d4-a716-446655440001",
    device_fingerprint: "fp-android-abc123",
    product_id: 3,
    product_serial: "WH-REF-DD-2024-003789",
    product_category_id: 3,
    product_category_name: "Double Door Refrigerators",
    checklist_id: 2,
    checklist_name: "Refrigerator QC",
    inspection_type: "outbound",
    created_at: "2024-03-03T09:15:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-444444444444",
    inspector_id: 1,
    inspector_name: "Amit Sharma",
    device_id: "550e8400-e29b-41d4-a716-446655440003",
    device_fingerprint: "fp-chrome-win-xyz789",
    product_id: 1,
    product_serial: "WH-FL-2024-001234",
    product_category_id: 1,
    product_category_name: "Front Load Washing Machines",
    checklist_id: 1,
    checklist_name: "Front Load Pre-Dispatch",
    inspection_type: "inbound",
    created_at: "2024-03-04T11:45:00Z",
  },
];

export const getInspections = async (): Promise<Inspection[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...inspections]);
    }, 1000);
  });
};

export const getInspectionById = async (
  id: string,
): Promise<Inspection | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const found = inspections.find((i) => i.id === id) ?? null;
      resolve(found);
    }, 400);
  });
};

export const getInspectionRelationship = async (
  id: string,
): Promise<InspectionRelationship | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const current = inspections.find((i) => i.id === id);
      if (!current) {
        resolve(null);
        return;
      }

      const productSerial = current.product_serial;
      const related = inspections.filter((i) => i.product_serial === productSerial);
      const inbound = related.find((i) => i.inspection_type === "inbound") ?? current;
      const outbound =
        related.find((i) => i.inspection_type === "outbound" && i.id !== inbound.id) ??
        (inbound.id === current.id
          ? {
              ...current,
              id: "mock-outbound-for-validation",
              inspection_type: "outbound" as const,
              inspector_id: 3,
              inspector_name: "Rahul Gupta",
              device_id: "550e8400-e29b-41d4-a716-446655440004",
              device_fingerprint: "fp-android-mock999",
              created_at: "2024-03-06T12:20:00Z",
            }
          : null);

      resolve({
        inbound: {
          inspectionId: inbound.id,
          scannedAt: inbound.created_at,
          personId: inbound.inspector_id,
          personName: inbound.inspector_name,
          deviceId: inbound.device_id,
          deviceFingerprint: inbound.device_fingerprint,
        },
        outbound: outbound
          ? {
              inspectionId: outbound.id,
              scannedAt: outbound.created_at,
              personId: outbound.inspector_id,
              personName: outbound.inspector_name,
              deviceId: outbound.device_id,
              deviceFingerprint: outbound.device_fingerprint,
            }
          : null,
      });
    }, 300);
  });
};

export const getInspectionsByDeviceId = async (
  deviceId: string,
): Promise<Inspection[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const list = inspections.filter((i) => i.device_id === deviceId);
      resolve([...list]);
    }, 800);
  });
};

export const getInspectionsByUserId = async (
  userId: number,
): Promise<Inspection[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(inspections.filter((i) => i.inspector_id === userId));
    }, 600);
  });
};

/** KPI stats for inspections (e.g. list header / reports). */
export async function getInspectionKpis(
  _dateFrom?: string,
  _dateTo?: string,
): Promise<InspectionKpis> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        total: 156,
        totalChange: "+12.4%",
        totalChangeType: "positive",
        inbound: 62,
        inboundChange: "+8.2%",
        inboundChangeType: "positive",
        outbound: 94,
        outboundChange: "+15.1%",
        outboundChangeType: "positive",
        uniqueInspectors: 12,
        inspectorsChange: "+2",
        inspectorsChangeType: "positive",
      });
    }, 400);
  });
}
