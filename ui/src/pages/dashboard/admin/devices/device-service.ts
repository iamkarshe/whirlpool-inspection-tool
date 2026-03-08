/**
 * Aligned with backend Device: id (UUID), user_id, imei, device_type, device_fingerprint,
 * device_info, ip_address, proxy_ip_address, current_lat, current_lng, is_locked
 * (+ mixin). user_name for display only.
 */
export type DeviceType = "desktop" | "mobile";

export interface Device {
  /** Device ID is UUID (string). */
  id: string;
  user_id: number;
  user_name: string;
  imei: string;
  device_type: DeviceType;
  device_fingerprint: string;
  device_info: string;
  is_locked: boolean;
  is_active: boolean;
  /** Last activity / last seen (for date range filter). */
  last_active_at?: string;
}

export const devices: Device[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    user_id: 1,
    user_name: "Amit Sharma",
    imei: "354789012345678",
    device_type: "mobile",
    device_fingerprint: "fp-android-abc123",
    device_info: "Android 14, Samsung Galaxy",
    is_locked: false,
    is_active: true,
    last_active_at: "2024-03-05T09:00:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    user_id: 2,
    user_name: "Priya Verma",
    imei: "861234567890123",
    device_type: "mobile",
    device_fingerprint: "fp-android-def456",
    device_info: "Android 13, OnePlus",
    is_locked: false,
    is_active: true,
    last_active_at: "2024-03-04T14:30:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    user_id: 1,
    user_name: "Amit Sharma",
    imei: "N/A",
    device_type: "desktop",
    device_fingerprint: "fp-chrome-win-xyz789",
    device_info: "Chrome 120, Windows 11",
    is_locked: false,
    is_active: true,
    last_active_at: "2024-03-05T08:15:00Z",
  },
];

export const getDevices = async (): Promise<Device[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(devices);
    }, 1500);
  });
};

export const getDeviceById = async (id: string): Promise<Device | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const device = devices.find((d) => d.id === id) ?? null;
      resolve(device);
    }, 800);
  });
};
