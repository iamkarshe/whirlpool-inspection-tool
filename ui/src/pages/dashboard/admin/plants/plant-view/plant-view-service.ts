/**
 * Demo service: users, devices, and inspections scoped to a plant.
 * Mock maps plant_id -> ids; a real API would filter by plant.
 */
import { devices } from "@/pages/dashboard/admin/devices/device-service";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import type { User } from "@/pages/dashboard/admin/users/user-service";
import { users } from "@/pages/dashboard/admin/users/user-service";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";
import { getInspections } from "@/pages/dashboard/inspections/inspection-service";

/** Mock: plant_id -> user ids assigned to that plant. */
const plantUserIds: Record<string, number[]> = {
  "880e8400-e29b-41d4-a716-446655440001": [1, 2, 3],
  "880e8400-e29b-41d4-a716-446655440002": [2, 3],
  "880e8400-e29b-41d4-a716-446655440003": [1, 3],
};

/** Mock: plant_id -> device ids at that plant. */
const plantDeviceIds: Record<string, string[]> = {
  "880e8400-e29b-41d4-a716-446655440001": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002",
  ],
  "880e8400-e29b-41d4-a716-446655440002": [
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003",
  ],
  "880e8400-e29b-41d4-a716-446655440003": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440003",
  ],
};

/** Mock: plant_id -> inspection ids at that plant. */
const plantInspectionIds: Record<string, string[]> = {
  "880e8400-e29b-41d4-a716-446655440001": [
    "a1b2c3d4-e5f6-7890-abcd-111111111111",
    "a1b2c3d4-e5f6-7890-abcd-333333333333",
  ],
  "880e8400-e29b-41d4-a716-446655440002": [
    "a1b2c3d4-e5f6-7890-abcd-222222222222",
    "a1b2c3d4-e5f6-7890-abcd-333333333333",
    "a1b2c3d4-e5f6-7890-abcd-444444444444",
  ],
  "880e8400-e29b-41d4-a716-446655440003": [
    "a1b2c3d4-e5f6-7890-abcd-111111111111",
    "a1b2c3d4-e5f6-7890-abcd-444444444444",
  ],
};

export async function getUsersByPlantId(plantId: string): Promise<User[]> {
  const ids = plantUserIds[plantId] ?? [];
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(users.filter((u) => ids.includes(u.id)));
    }, 600);
  });
}

export async function getDevicesByPlantId(plantId: string): Promise<Device[]> {
  const ids = plantDeviceIds[plantId] ?? [];
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(devices.filter((d) => ids.includes(d.id)));
    }, 600);
  });
}

export async function getInspectionsByPlantId(
  plantId: string,
): Promise<Inspection[]> {
  const ids = plantInspectionIds[plantId] ?? [];
  const all = await getInspections();
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(all.filter((i) => ids.includes(i.id)));
    }, 600);
  });
}
