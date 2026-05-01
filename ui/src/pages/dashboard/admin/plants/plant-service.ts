/**
 * Plant master data (independent from warehouses).
 * Aligned with a typical backend Plant: id (UUID), plant_code, name, lat, lng, address.
 * Optional counts are for list/table display (mock or from API).
 */
export interface Plant {
  /** Plant ID is UUID (string). */
  id: string;
  plant_code: string;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string;
  /** Mock/API: number of users linked to this plant. */
  users_count?: number;
  /** Mock/API: number of devices at this plant. */
  devices_count?: number;
  /** Mock/API: number of inspections at this plant. */
  inspections_count?: number;
}

export const plants: Plant[] = [
  {
    id: "880e8400-e29b-41d4-a716-446655440001",
    plant_code: "PL-PUN-01",
    name: "Pune Assembly Plant",
    lat: 18.5204,
    lng: 73.8567,
    address: "Hinjawadi, Pune, Maharashtra",
    users_count: 4,
    devices_count: 9,
    inspections_count: 36,
  },
  {
    id: "880e8400-e29b-41d4-a716-446655440002",
    plant_code: "PL-MUM-01",
    name: "Mumbai Components Plant",
    lat: 19.076,
    lng: 72.8777,
    address: "Andheri East, Mumbai, Maharashtra",
    users_count: 6,
    devices_count: 11,
    inspections_count: 52,
  },
  {
    id: "880e8400-e29b-41d4-a716-446655440003",
    plant_code: "PL-FAR-01",
    name: "Faridabad Finishing Plant",
    lat: 28.4089,
    lng: 77.3178,
    address: "Sector 88, Faridabad, Haryana",
    users_count: 3,
    devices_count: 7,
    inspections_count: 28,
  },
];

export const getPlants = async (): Promise<Plant[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(plants);
    }, 1500);
  });
};

export const getPlantById = async (id: string): Promise<Plant | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const plant = plants.find((p) => p.id === id) ?? null;
      resolve(plant);
    }, 600);
  });
};
