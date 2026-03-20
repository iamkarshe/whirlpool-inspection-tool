/**
 * Mock: PWA device notifications (per-device notification history + send).
 * Kept in-memory on the front-end for now.
 */

export type DeviceNotificationStatus = "queued" | "sent" | "failed";

export type DeviceNotificationType = "inspection" | "system";

export interface DeviceNotification {
  id: string;
  device_id: string;
  title: string;
  message: string;
  type: DeviceNotificationType;
  status: DeviceNotificationStatus;
  sent_at: string; // ISO string
}

export interface SendDeviceNotificationPayload {
  title: string;
  message: string;
  type?: DeviceNotificationType;
}

const notificationsByDeviceId: Record<string, DeviceNotification[]> = {
  "550e8400-e29b-41d4-a716-446655440001": [
    {
      id: "notif-001",
      device_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Inspection reminder",
      message: "Don't forget to complete today's packing checks.",
      type: "inspection",
      status: "sent",
      sent_at: "2024-03-06T06:15:00Z",
    },
    {
      id: "notif-002",
      device_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Device locked",
      message: "Your device was temporarily locked due to security checks.",
      type: "system",
      status: "sent",
      sent_at: "2024-03-12T12:42:00Z",
    },
  ],
  "550e8400-e29b-41d4-a716-446655440002": [
    {
      id: "notif-010",
      device_id: "550e8400-e29b-41d4-a716-446655440002",
      title: "Login verification",
      message: "Please verify your session to continue inspections.",
      type: "system",
      status: "queued",
      sent_at: "2024-03-09T17:23:00Z",
    },
  ],
};

export async function getNotificationsByDeviceId(
  deviceId: string,
): Promise<DeviceNotification[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const list = notificationsByDeviceId[deviceId] ?? [];
      resolve([...list].sort((a, b) => +new Date(b.sent_at) - +new Date(a.sent_at)));
    }, 500);
  });
}

export async function sendNotificationToDevice(
  deviceId: string,
  payload: SendDeviceNotificationPayload,
): Promise<DeviceNotification> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const type: DeviceNotificationType = payload.type ?? "inspection";

      const notif: DeviceNotification = {
        id: `notif-${Math.random().toString(16).slice(2)}-${Date.now()}`,
        device_id: deviceId,
        title: payload.title,
        message: payload.message,
        type,
        status: "sent",
        sent_at: new Date().toISOString(),
      };

      notificationsByDeviceId[deviceId] = [
        notif,
        ...(notificationsByDeviceId[deviceId] ?? []),
      ];

      resolve(notif);
    }, 700);
  });
}

