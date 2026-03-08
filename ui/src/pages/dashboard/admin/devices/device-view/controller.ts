import {
  getDeviceById,
  type Device,
} from "@/pages/dashboard/admin/devices/device-service";

/**
 * Load device for the view page by id (UUID string).
 * Returns null if id is invalid or device not found.
 */
export async function loadDeviceView(id: string): Promise<Device | null> {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return null;
  }
  return getDeviceById(id);
}
