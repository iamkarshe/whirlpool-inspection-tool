/**
 * Aligned with backend Warehouse: id, warehouse_code, name, lat, lng, address.
 */
export interface Warehouse {
  id: number;
  warehouse_code: string;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string;
}

export const warehouses: Warehouse[] = [
  {
    id: 1,
    warehouse_code: "WH-PUN-01",
    name: "Pune North Hub",
    lat: 18.5204,
    lng: 73.8567,
    address: "Hinjawadi, Pune, Maharashtra",
  },
  {
    id: 2,
    warehouse_code: "WH-PUN-02",
    name: "Pune South Hub",
    lat: 18.4432,
    lng: 73.8296,
    address: "Hadapsar, Pune, Maharashtra",
  },
  {
    id: 3,
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
