import type { WarehouseDeviceResponse } from "@/api/generated/model/warehouseDeviceResponse";
import type { WarehouseInspectionResponse } from "@/api/generated/model/warehouseInspectionResponse";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import type { WarehouseUserResponse } from "@/api/generated/model/warehouseUserResponse";

export type WarehouseViewContext = {
  warehouse: WarehouseResponse;
  users: WarehouseUserResponse[];
  devices: WarehouseDeviceResponse[];
  inspections: WarehouseInspectionResponse[];
};
