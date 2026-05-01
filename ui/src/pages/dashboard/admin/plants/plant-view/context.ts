import type { PlantDeviceResponse } from "@/api/generated/model/plantDeviceResponse";
import type { PlantResponse } from "@/api/generated/model/plantResponse";
import type { PlantUserResponse } from "@/api/generated/model/plantUserResponse";

export type PlantViewContext = {
  plant: PlantResponse;
  users: PlantUserResponse[];
  devices: PlantDeviceResponse[];
};
