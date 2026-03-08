/**
 * Demo service: returns users, devices, and inspections scoped to a warehouse.
 * Mock assignment maps warehouse_id -> ids; real API would filter by warehouse.
 */
import { devices } from "@/pages/dashboard/admin/devices/device-service";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import type { User } from "@/pages/dashboard/admin/users/user-service";
import { users } from "@/pages/dashboard/admin/users/user-service";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";
import { getInspections } from "@/pages/dashboard/inspections/inspection-service";

/** Mock: warehouse_id -> user ids assigned to that warehouse. */
const warehouseUserIds: Record<string, number[]> = {
  "770e8400-e29b-41d4-a716-446655440001": [1, 2],
  "770e8400-e29b-41d4-a716-446655440002": [2, 3],
  "770e8400-e29b-41d4-a716-446655440003": [1, 3],
};

/** Mock: warehouse_id -> device ids at that warehouse. */
const warehouseDeviceIds: Record<string, string[]> = {
  "770e8400-e29b-41d4-a716-446655440001": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002",
  ],
  "770e8400-e29b-41d4-a716-446655440002": [
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003",
  ],
  "770e8400-e29b-41d4-a716-446655440003": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440003",
  ],
};

/** Mock: warehouse_id -> inspection ids at that warehouse. */
const warehouseInspectionIds: Record<string, string[]> = {
  "770e8400-e29b-41d4-a716-446655440001": [
    "a1b2c3d4-e5f6-7890-abcd-111111111111",
    "a1b2c3d4-e5f6-7890-abcd-222222222222",
    "a1b2c3d4-e5f6-7890-abcd-333333333333",
  ],
  "770e8400-e29b-41d4-a716-446655440002": [
    "a1b2c3d4-e5f6-7890-abcd-222222222222",
    "a1b2c3d4-e5f6-7890-abcd-444444444444",
  ],
  "770e8400-e29b-41d4-a716-446655440003": [
    "a1b2c3d4-e5f6-7890-abcd-111111111111",
    "a1b2c3d4-e5f6-7890-abcd-444444444444",
  ],
};

export async function getUsersByWarehouseId(
  warehouseId: string,
): Promise<User[]> {
  const ids = warehouseUserIds[warehouseId] ?? [];
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(users.filter((u) => ids.includes(u.id)));
    }, 600);
  });
}

export async function getDevicesByWarehouseId(
  warehouseId: string,
): Promise<Device[]> {
  const ids = warehouseDeviceIds[warehouseId] ?? [];
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(devices.filter((d) => ids.includes(d.id)));
    }, 600);
  });
}

export async function getInspectionsByWarehouseId(
  warehouseId: string,
): Promise<Inspection[]> {
  const ids = warehouseInspectionIds[warehouseId] ?? [];
  const all = await getInspections();
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(all.filter((i) => ids.includes(i.id)));
    }, 600);
  });
}
