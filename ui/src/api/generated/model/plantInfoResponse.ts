import type { PlantDeviceResponse } from "./plantDeviceResponse";
import type { PlantResponse } from "./plantResponse";
import type { PlantUserResponse } from "./plantUserResponse";

export interface PlantInfoResponse {
  plant: PlantResponse;
  users?: PlantUserResponse[];
  devices?: PlantDeviceResponse[];
}
