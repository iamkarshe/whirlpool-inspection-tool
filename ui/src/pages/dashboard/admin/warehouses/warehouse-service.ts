/**
 * Aligned with backend Warehouse: id (UUID), warehouse_code, name, lat, lng, address.
 */
export interface Warehouse {
  /** Warehouse ID is UUID (string). */
  id: string;
  warehouse_code: string;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string;
}

export const warehouses: Warehouse[] = [
  {
    id: "770e8400-e29b-41d4-a716-446655440001",
    warehouse_code: "WH-PUN-01",
    name: "Pune North Hub",
    lat: 18.5204,
    lng: 73.8567,
    address: "Hinjawadi, Pune, Maharashtra",
  },
  {
    id: "770e8400-e29b-41d4-a716-446655440002",
    warehouse_code: "WH-PUN-02",
    name: "Pune South Hub",
    lat: 18.4432,
    lng: 73.8296,
    address: "Hadapsar, Pune, Maharashtra",
  },
  {
    id: "770e8400-e29b-41d4-a716-446655440003",
    warehouse_code: "WH-FAR-01",
    name: "Faridabad Distribution",
    lat: 28.4089,
    lng: 77.3178,
    address: "Sector 88, Faridabad, Haryana",
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
