import type { DeviceResponse } from "@/api/generated/model/deviceResponse";
import type { UserResponse } from "@/api/generated/model/userResponse";
import type { WarehouseResponseWithStats } from "@/services/warehouses-api";

export type WarehouseViewContext = {
  warehouse: WarehouseResponseWithStats;
  users: UserResponse[];
  devices: DeviceResponse[];
};
