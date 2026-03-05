export type WarehouseStatus = "active" | "inactive";

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  location: string;
  capacity: number;
  status: WarehouseStatus;
}

export const warehouses: Warehouse[] = [
  {
    id: 1,
    name: "North Hub",
    code: "WH-NORTH",
    location: "Chicago, IL",
    capacity: 1200,
    status: "active",
  },
  {
    id: 2,
    name: "South Hub",
    code: "WH-SOUTH",
    location: "Dallas, TX",
    capacity: 950,
    status: "active",
  },
  {
    id: 3,
    name: "Overflow Storage",
    code: "WH-OVERFLOW",
    location: "Phoenix, AZ",
    capacity: 600,
    status: "inactive",
  },
];

