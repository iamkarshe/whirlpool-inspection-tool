import type { WarehouseDeviceResponse } from "./warehouseDeviceResponse";
import type { WarehouseResponse } from "./warehouseResponse";
import type { WarehouseUserResponse } from "./warehouseUserResponse";

export interface WarehouseInfoResponse {
  warehouse: WarehouseResponse;
  users?: WarehouseUserResponse[];
  devices?: WarehouseDeviceResponse[];
}
