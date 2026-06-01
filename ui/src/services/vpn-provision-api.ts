import { isAxiosError } from "axios";

import { getVpnProvision } from "@/api/generated/vpn-provision/vpn-provision";

export type VpnWireguardPeer = {
  public_key: string;
  allowed_ip: string;
};

export type VpnProvisionDevice = {
  uuid: string;
  user_name: string;
  user_email: string;
  device_name: string;
  device_type?: string;
  assigned_ip: string;
  is_active: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapVpnEnvelope(data: unknown): unknown {
  if (
    isRecord(data) &&
    data.success === true &&
    "data" in data &&
    data.data !== undefined
  ) {
    return data.data;
  }
  return data;
}

function normalizePeer(raw: unknown): VpnWireguardPeer | null {
  if (!isRecord(raw)) return null;
  const public_key = String(
    raw.public_key ?? raw.publicKey ?? raw.PublicKey ?? "",
  ).trim();
  let allowed_ip = String(
    raw.allowed_ip ?? raw.allowedIP ?? raw.AllowedIP ?? "",
  ).trim();
  if (!allowed_ip && Array.isArray(raw.allowed_ips) && raw.allowed_ips.length > 0) {
    allowed_ip = String(raw.allowed_ips[0]).trim();
  }
  allowed_ip = allowed_ip.replace(/\/32$/, "");
  if (!public_key && !allowed_ip) return null;
  return { public_key, allowed_ip };
}

function normalizeDevice(raw: unknown): VpnProvisionDevice | null {
  if (!isRecord(raw)) return null;
  const uuid = String(raw.uuid ?? "").trim();
  if (!uuid) return null;
  return {
    uuid,
    user_name: String(raw.user_name ?? raw.userName ?? ""),
    user_email: String(raw.user_email ?? raw.userEmail ?? ""),
    device_name: String(raw.device_name ?? raw.deviceName ?? ""),
    device_type: raw.device_type != null ? String(raw.device_type) : undefined,
    assigned_ip: String(raw.assigned_ip ?? raw.assignedIP ?? ""),
    is_active: Boolean(raw.is_active ?? raw.isActive ?? true),
  };
}

function parseJsonIfString(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

function parsePeersPayload(data: unknown): VpnWireguardPeer[] {
  const root = unwrapVpnEnvelope(parseJsonIfString(data));
  if (Array.isArray(root)) {
    return root.flatMap((row) => {
      const peer = normalizePeer(row);
      return peer ? [peer] : [];
    });
  }
  if (isRecord(root) && Array.isArray(root.peers)) {
    return parsePeersPayload(root.peers);
  }
  return [];
}

function parseDevicesPayload(data: unknown): VpnProvisionDevice[] {
  const root = unwrapVpnEnvelope(parseJsonIfString(data));
  if (Array.isArray(root)) {
    return root.flatMap((row) => {
      const device = normalizeDevice(row);
      return device ? [device] : [];
    });
  }
  if (isRecord(root) && Array.isArray(root.devices)) {
    return parseDevicesPayload(root.devices);
  }
  return [];
}

export async function fetchVpnWireguardPeers(opts?: {
  signal?: AbortSignal;
}): Promise<VpnWireguardPeer[]> {
  const api = getVpnProvision();
  const data = await api.vpnProvisionWireguardPeersApiVpnPeersGet(
    opts?.signal ? { signal: opts.signal } : undefined,
  );
  return parsePeersPayload(data);
}

export async function fetchVpnProvisionDevices(opts?: {
  signal?: AbortSignal;
}): Promise<VpnProvisionDevice[]> {
  const api = getVpnProvision();
  const data = await api.vpnProvisionListDevicesApiVpnDevicesGet(
    opts?.signal ? { signal: opts.signal } : undefined,
  );
  return parseDevicesPayload(data);
}

export function vpnProvisionApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (!isAxiosError(err)) return err instanceof Error ? err.message : fallback;
  const data = err.response?.data as unknown;
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.length > 0) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]?.msg ?? detail[0]?.type;
      if (typeof first === "string" && first.length > 0) return first;
    }
  }
  if (typeof err.response?.status === "number") {
    return `${fallback} (HTTP ${err.response.status}).`;
  }
  if (typeof err.message === "string" && err.message.length > 0) return err.message;
  return fallback;
}
