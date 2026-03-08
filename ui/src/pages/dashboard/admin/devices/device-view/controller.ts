import {
  getDeviceById,
  type Device,
} from "@/pages/dashboard/admin/devices/device-service";

/**
 * Load device for the view page by id.
 * Returns null if id is invalid or device not found.
 */
export async function loadDeviceView(id: number): Promise<Device | null> {
  if (Number.isNaN(id) || id < 1) {
    return null;
  }
  return getDeviceById(id);
}
