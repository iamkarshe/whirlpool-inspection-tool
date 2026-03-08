/**
 * Aligned with backend Warehouse: id (UUID), warehouse_code, name, lat, lng, address.
 * Optional counts are for list/table display (mock or from API).
 */
export interface Warehouse {
  /** Warehouse ID is UUID (string). */
  id: string;
  warehouse_code: string;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string;
  /** Mock/API: number of users linked to this warehouse. */
  users_count?: number;
  /** Mock/API: number of devices at this warehouse. */
  devices_count?: number;
  /** Mock/API: number of inspections at this warehouse. */
  inspections_count?: number;
}

export const warehouses: Warehouse[] = [
  {
    id: "770e8400-e29b-41d4-a716-446655440001",
    warehouse_code: "WH-PUN-01",
    name: "Pune North Hub",
    lat: 18.5204,
    lng: 73.8567,
    address: "Hinjawadi, Pune, Maharashtra",
    users_count: 5,
    devices_count: 12,
    inspections_count: 48,
  },
  {
    id: "770e8400-e29b-41d4-a716-446655440002",
    warehouse_code: "WH-PUN-02",
    name: "Pune South Hub",
    lat: 18.4432,
    lng: 73.8296,
    address: "Hadapsar, Pune, Maharashtra",
    users_count: 3,
    devices_count: 8,
    inspections_count: 22,
  },
  {
    id: "770e8400-e29b-41d4-a716-446655440003",
    warehouse_code: "WH-FAR-01",
    name: "Faridabad Distribution",
    lat: 28.4089,
    lng: 77.3178,
    address: "Sector 88, Faridabad, Haryana",
    users_count: 4,
    devices_count: 6,
    inspections_count: 31,
  },
];

export const getWarehouses = async (): Promise<Warehouse[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(warehouses);
    }, 1500);
  });
};

export const getWarehouseById = async (
  id: string,
): Promise<Warehouse | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const warehouse = warehouses.find((w) => w.id === id) ?? null;
      resolve(warehouse);
    }, 600);
  });
};
