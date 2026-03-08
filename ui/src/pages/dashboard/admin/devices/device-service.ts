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

export interface DeviceKpis {
  totalDevices: number;
  totalChange: string;
  totalChangeType: "positive" | "negative";
  activeDevices: number;
  activeChange: string;
  activeChangeType: "positive" | "negative";
  mobileDevices: number;
  mobileChange: string;
  mobileChangeType: "positive" | "negative";
  desktopDevices: number;
  desktopChange: string;
  desktopChangeType: "positive" | "negative";
}

export const getDevices = async (): Promise<Device[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(devices);
    }, 1500);
  });
};

export async function getDeviceKpis(): Promise<DeviceKpis> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalDevices: 48,
        totalChange: "+6.7%",
        totalChangeType: "positive",
        activeDevices: 42,
        activeChange: "+8.2%",
        activeChangeType: "positive",
        mobileDevices: 35,
        mobileChange: "+5.1%",
        mobileChangeType: "positive",
        desktopDevices: 13,
        desktopChange: "+11.2%",
        desktopChangeType: "positive",
      });
    }, 400);
  });
}

export const getDeviceById = async (id: string): Promise<Device | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const device = devices.find((d) => d.id === id) ?? null;
      resolve(device);
    }, 800);
  });
};

export const getDevicesByUserId = async (
  userId: number,
): Promise<Device[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(devices.filter((d) => d.user_id === userId));
    }, 600);
  });
};
