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

/** Inspections for a given device (service layer filters by device_id). */
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
