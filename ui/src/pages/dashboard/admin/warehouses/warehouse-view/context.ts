import type { WarehouseDeviceResponse } from "@/api/generated/model/warehouseDeviceResponse";
import type { WarehouseUserResponse } from "@/api/generated/model/warehouseUserResponse";
import type { WarehouseResponseWithStats } from "@/services/warehouses-api";

export type WarehouseViewContext = {
  warehouse: WarehouseResponseWithStats;
  users: WarehouseUserResponse[];
  devices: WarehouseDeviceResponse[];
};
