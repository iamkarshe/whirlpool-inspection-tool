import { getPushNotification } from "@/api/generated/push-notification/push-notification";
import type {
  BrowserPushSubscription,
  PushSubscriptionCreate,
  PushUserSendRequest,
} from "@/api/generated/model";
import { getOrCreatePersistentDeviceId } from "@/lib/device-fingerprint";
import { getServerAssignedDeviceUuid } from "@/lib/session-device-uuid";

type VapidPublicKeyResponse = {
  publicKey?: string;
  public_key?: string;
};

export type PushNotificationSetupStatus = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  serviceWorkerReady: boolean;
  subscribed: boolean;
  enabled: boolean;
};

const PUSH_NOTIFICATIONS_ENABLED_KEY = "whirlpool.pwaNotifications.enabled";

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

export async function getCurrentPushNotificationSetupStatus(): Promise<PushNotificationSetupStatus> {
  if (!isPushNotificationSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      serviceWorkerReady: false,
      subscribed: false,
      enabled: false,
    };
  }

  const permission = Notification.permission;
  let serviceWorkerReady = false;
  let subscribed = false;

  try {
    const registration = await navigator.serviceWorker.ready;
    serviceWorkerReady = true;
    subscribed = Boolean(await registration.pushManager.getSubscription());
  } catch {
    serviceWorkerReady = false;
  }

  const enabled = permission === "granted" && serviceWorkerReady && subscribed;
  if (enabled) {
    window.localStorage.setItem(PUSH_NOTIFICATIONS_ENABLED_KEY, "true");
  }

  return {
    supported: true,
    permission,
    serviceWorkerReady,
    subscribed,
    enabled,
  };
}

export function markPushNotificationsEnabled(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PUSH_NOTIFICATIONS_ENABLED_KEY, "true");
}

function normalizeVapidPublicKeyResponse(response: unknown): string {
  const rec =
    response && typeof response === "object"
      ? (response as VapidPublicKeyResponse)
      : {};
  const key = rec.publicKey ?? rec.public_key;
  if (!key?.trim()) {
    throw new Error("VAPID public key is not configured.");
  }
  return key.trim();
}

async function resolveVapidPublicKey(): Promise<string> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (envKey) return envKey;

  const response =
    await getPushNotification().getVapidPublicKeyApiPushVapidPublicKeyGet();
  return normalizeVapidPublicKeyResponse(response);
}

function browserSubscriptionFromPushSubscription(
  subscription: PushSubscription,
): BrowserPushSubscription {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("Browser returned an incomplete push subscription.");
  }

  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh, auth },
  };
}

function buildPushSubscriptionPayload(
  subscription: PushSubscription,
): PushSubscriptionCreate {
  let deviceFingerprint: string | null = null;
  try {
    deviceFingerprint = getOrCreatePersistentDeviceId();
  } catch {
    deviceFingerprint = null;
  }

  return {
    subscription: browserSubscriptionFromPushSubscription(subscription),
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
      applicationServerKey: urlBase64ToUint8Array(
        await resolveVapidPublicKey(),
      ),
    }));

  await getPushNotification().savePushSubscriptionApiPushSubscriptionsPost(
    buildPushSubscriptionPayload(subscription),
  );
  markPushNotificationsEnabled();
}

export async function sendTestPushNotificationToUser(
  userUuid: string,
): Promise<void> {
  const payload: PushUserSendRequest = {
    user_uuid: userUuid,
    notification: {
      title: "Whirlpool PDI test",
      body: "Push notifications are working on this device.",
      url: "/ops",
      tag: "whirlpool-push-test",
      data: {
        kind: "test",
        sent_at: new Date().toISOString(),
        device_uuid: getServerAssignedDeviceUuid(),
      },
    },
  };

  await getPushNotification().sendUserNotificationApiPushSendUserPost(payload);
}
