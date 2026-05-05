import type { DeviceResponse } from "@/api/generated/model/deviceResponse";
import type { PlantResponse } from "@/api/generated/model/plantResponse";
import type { UserResponse } from "@/api/generated/model/userResponse";

export type PlantViewContext = {
  plant: PlantResponse;
  users: UserResponse[];
  devices: DeviceResponse[];
};
