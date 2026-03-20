/**
 * Mock: device lock/unlock audit history.
 * These endpoints are front-end only for now (no backend wiring).
 */

export type DeviceLockAction = "lock" | "unlock";

export interface DeviceLockHistoryEvent {
  id: string;
  device_id: string;
  action: DeviceLockAction;
  actor_name: string;
  actor_email: string;
  occurred_at: string; // ISO string
  reason?: string | null;
}

const lockHistoryByDeviceId: Record<string, DeviceLockHistoryEvent[]> = {
  "550e8400-e29b-41d4-a716-446655440001": [
    {
      id: "lock-100",
      device_id: "550e8400-e29b-41d4-a716-446655440001",
      action: "lock",
      actor_name: "Amit Sharma",
      actor_email: "amit.sharma@whirlpool.com",
      occurred_at: "2024-03-05T10:15:00Z",
      reason: "Device reported as offline outside schedule.",
    },
    {
      id: "lock-101",
      device_id: "550e8400-e29b-41d4-a716-446655440001",
      action: "unlock",
      actor_name: "Rahul Gupta",
      actor_email: "rahul.gupta@whirlpool.com",
      occurred_at: "2024-03-06T08:05:00Z",
      reason: "Connectivity restored after verification.",
    },
    {
      id: "lock-102",
      device_id: "550e8400-e29b-41d4-a716-446655440001",
      action: "lock",
      actor_name: "Priya Verma",
      actor_email: "priya.verma@whirlpool.com",
      occurred_at: "2024-03-12T12:40:00Z",
      reason: "Suspicious fingerprint mismatch detected.",
    },
  ],
  "550e8400-e29b-41d4-a716-446655440002": [
    {
      id: "lock-200",
      device_id: "550e8400-e29b-41d4-a716-446655440002",
      action: "lock",
      actor_name: "Priya Verma",
      actor_email: "priya.verma@whirlpool.com",
      occurred_at: "2024-03-09T17:20:00Z",
      reason: "Multiple failed sessions.",
    },
    {
      id: "lock-201",
      device_id: "550e8400-e29b-41d4-a716-446655440002",
      action: "unlock",
      actor_name: "Amit Sharma",
      actor_email: "amit.sharma@whirlpool.com",
      occurred_at: "2024-03-10T09:45:00Z",
      reason: "Successful re-auth after device check.",
    },
  ],
};

export async function getDeviceLockHistoryByDeviceId(
  deviceId: string,
): Promise<DeviceLockHistoryEvent[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const list = lockHistoryByDeviceId[deviceId] ?? [];
      resolve([...list].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)));
    }, 600);
  });
}

