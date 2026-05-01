import {
  type Device,
} from "@/pages/dashboard/admin/devices/device-service";
import { fetchDeviceDetail } from "@/services/devices-api";

/**
 * Load device for the view page by id (UUID string).
 * Returns null if id is invalid or device not found.
 */
export async function loadDeviceView(id: string): Promise<Device | null> {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return null;
  }
  try {
    return await fetchDeviceDetail(id);
  } catch {
    return null;
  }
}
