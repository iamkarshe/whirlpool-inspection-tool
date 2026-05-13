import { apiClient } from "@/api/axios-instance";
import { getOrCreatePersistentDeviceId } from "@/lib/device-fingerprint";
import { getServerAssignedDeviceUuid } from "@/lib/session-device-uuid";

const VAPID_PUBLIC_KEY_ENDPOINT = "/api/push/vapid-public-key";
const PUSH_SUBSCRIPTION_ENDPOINT = "/api/push/subscriptions";

type VapidPublicKeyResponse = {
  publicKey?: string;
  public_key?: string;
};

export type PushSubscriptionPayload = {
  subscription: PushSubscriptionJSON;
  device_uuid: string | null;
  device_fingerprint: string | null;
  user_agent: string;
  timezone: string;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function resolveVapidPublicKey(): Promise<string> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (envKey) return envKey;

  const response = await apiClient.get<VapidPublicKeyResponse>(
    VAPID_PUBLIC_KEY_ENDPOINT,
  );
  const key = response.data.publicKey ?? response.data.public_key;
  if (!key?.trim()) {
    throw new Error("VAPID public key is not configured.");
  }
  return key.trim();
}

function buildPushSubscriptionPayload(
  subscription: PushSubscription,
): PushSubscriptionPayload {
  let deviceFingerprint: string | null = null;
  try {
    deviceFingerprint = getOrCreatePersistentDeviceId();
  } catch {
    deviceFingerprint = null;
  }

  return {
    subscription: subscription.toJSON(),
    device_uuid: getServerAssignedDeviceUuid(),
    device_fingerprint: deviceFingerprint,
    user_agent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function subscribeCurrentDeviceToPush(): Promise<void> {
  if (!isPushNotificationSupported()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(await resolveVapidPublicKey()),
    }));

  await apiClient.post(
    PUSH_SUBSCRIPTION_ENDPOINT,
    buildPushSubscriptionPayload(subscription),
  );
}
