import { isAxiosError } from "axios";
import type { DeviceKpiResponse } from "@/api/generated/model/deviceKpiResponse";
import type { DeviceListResponse } from "@/api/generated/model/deviceListResponse";
import type { DeviceResponse } from "@/api/generated/model/deviceResponse";
import type { GetDevicesApiDevicesGetParams } from "@/api/generated/model/getDevicesApiDevicesGetParams";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import { getDevices } from "@/api/generated/devices/devices";
import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import type { Device, DeviceKpis } from "@/pages/dashboard/admin/devices/device-service";

export type DevicesListParams = Pick<
  GetDevicesApiDevicesGetParams,
  "page" | "per_page" | "search" | "sort_by" | "sort_dir" | "date_field" | "date_from" | "date_to" | "is_active"
>;

function mapDevice(api: DeviceResponse): Device {
  return {
    id: api.uuid,
    user_id: api.user_id,
    user_name: api.user_name,
    imei: api.imei,
    device_type: api.device_type === "desktop" ? "desktop" : "mobile",
    device_fingerprint: api.device_fingerprint,
    device_info:
      typeof api.device_info === "string"
        ? api.device_info
        : JSON.stringify(api.device_info ?? {}),
    is_locked: api.is_locked,
    is_active: api.is_active,
    last_active_at: api.updated_at,
  };
}

export async function fetchDevicesPage(
  params: DevicesListParams,
  request?: { signal?: AbortSignal },
): Promise<{ data: Device[]; total: number }> {
  const api = getDevices();
  const res: DeviceListResponse = await api.getDevicesApiDevicesGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "id",
      sort_dir: params.sort_dir ?? "desc",
      date_field: params.date_field ?? null,
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      is_active: params.is_active,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
  return { data: res.data.map(mapDevice), total: res.total };
}

export async function fetchDeviceKpis(
  request?: { signal?: AbortSignal },
): Promise<DeviceKpis> {
  const api = getDevices();
  const res: DeviceKpiResponse = await api.getDevicesKpiApiDevicesKpiGet(
    request?.signal ? { signal: request.signal } : undefined,
  );
  return {
    totalDevices: res.total,
    totalChange: "0%",
    totalChangeType: "positive",
    activeDevices: res.active,
    activeChange: "0%",
    activeChangeType: "positive",
    mobileDevices: res.mobile,
    mobileChange: "0%",
    mobileChangeType: "positive",
    desktopDevices: res.desktop,
    desktopChange: "0%",
    desktopChangeType: "positive",
  };
}

export async function fetchDeviceDetail(
  deviceUuid: string,
  request?: { signal?: AbortSignal },
): Promise<Device> {
  const api = getDevices();
  const res = await api.getDeviceApiDevicesDeviceUuidGet(
    deviceUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
  return mapDevice(res);
}

export async function deleteDevice(
  deviceUuid: string,
  request?: { signal?: AbortSignal },
): Promise<void> {
  const api = getDevices();
  await api.deleteDeviceApiDevicesDeviceUuidDelete(
    deviceUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function lockDevice(
  deviceUuid: string,
  request?: { signal?: AbortSignal },
): Promise<void> {
  const api = getDevices();
  await api.lockDeviceApiDevicesDeviceUuidLockPatch(
    deviceUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export function deviceApiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return err instanceof Error ? err.message : fallback;
  const data = err.response?.data as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    Array.isArray((data as HTTPValidationError).detail)
  ) {
    const detail = (data as HTTPValidationError).detail!;
    const first = detail[0]?.msg ?? detail[0]?.type;
    if (typeof first === "string" && first.length > 0) return first;
  }
  if (typeof err.response?.status === "number") {
    return `${fallback} (HTTP ${err.response.status}).`;
  }
  if (typeof err.message === "string" && err.message.length > 0) return err.message;
  return fallback;
}
