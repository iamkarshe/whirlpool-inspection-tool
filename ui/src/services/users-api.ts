import { isAxiosError } from "axios";
import type { GetUsersApiUsersGetParams } from "@/api/generated/model/getUsersApiUsersGetParams";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { UserCreateRequest } from "@/api/generated/model/userCreateRequest";
import type { UserUpdateRequest } from "@/api/generated/model/userUpdateRequest";
import { UserCreateRequestRole } from "@/api/generated/model/userCreateRequestRole";
import type { UserListResponse } from "@/api/generated/model/userListResponse";
import type { UserOnboardResponse } from "@/api/generated/model/userOnboardResponse";
import type { UserResponse } from "@/api/generated/model/userResponse";
import { getUsers } from "@/api/generated/users/users";
import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import {
  readBlobErrorDetail,
  triggerBlobDownload,
} from "@/lib/download-blob";

const CREATABLE_USER_ROLES: ReadonlySet<UserCreateRequestRole> = new Set([
  UserCreateRequestRole.operator,
  UserCreateRequestRole.manager,
  UserCreateRequestRole["biz-admin"],
]);

/** Superadmins cannot be managed through admin create/update/deactivate UI. */
export function isSuperadminRoleName(role: string): boolean {
  return role.trim().toLowerCase() === "superadmin";
}

export type UsersListParams = Pick<
  GetUsersApiUsersGetParams,
  "page" | "per_page" | "search" | "sort_by" | "sort_dir" | "date_field" | "date_from" | "date_to"
> & {
  is_active?: boolean;
  role?: string | null;
};

export async function fetchUsersPage(
  params: UsersListParams,
  request?: { signal?: AbortSignal },
): Promise<UserListResponse> {
  const api = getUsers();
  return api.getUsersApiUsersGet(
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
      role: params.role ?? null,
    } as GetUsersApiUsersGetParams,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function createUser(
  payload: UserCreateRequest,
  request?: { signal?: AbortSignal },
): Promise<UserResponse> {
  if (payload.role != null && !CREATABLE_USER_ROLES.has(payload.role)) {
    throw new Error(
      "Only operator, manager, and biz-admin accounts can be created here.",
    );
  }
  const api = getUsers();
  return api.createUserApiUsersPost(
    payload,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

const UPDATABLE_ROLES = new Set<NonNullable<UserUpdateRequest["role"]>>([
  "manager",
  "operator",
  "biz-admin",
]);

export async function updateUser(
  userUuid: string,
  payload: UserUpdateRequest,
  request?: { signal?: AbortSignal },
): Promise<UserResponse> {
  if (
    payload.role != null &&
    !UPDATABLE_ROLES.has(payload.role)
  ) {
    throw new Error(
      "Only operator, manager, and biz-admin roles can be assigned here.",
    );
  }
  const api = getUsers();
  return api.updateUserApiUsersUserUuidPut(
    userUuid,
    payload,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function fetchAllUsers(
  request?: { signal?: AbortSignal },
): Promise<UserResponse[]> {
  const api = getUsers();
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const rows: UserResponse[] = [];
  while (page <= totalPages) {
    const res = await api.getUsersApiUsersGet(
      { page, per_page: perPage, sort_by: "id", sort_dir: "desc" },
      request?.signal ? { signal: request.signal } : undefined,
    );
    rows.push(...res.data);
    totalPages = Math.max(1, res.total_pages ?? 1);
    page += 1;
  }
  return rows;
}

/** Resolves one user via paginated GET /api/users (no single-user GET in API). */
export async function fetchUserByUuid(
  userUuid: string,
  opts?: { signal?: AbortSignal },
): Promise<UserResponse | null> {
  const want = userUuid.trim().toLowerCase();
  if (!want) return null;
  const api = getUsers();
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await api.getUsersApiUsersGet(
      { page, per_page: perPage, sort_by: "id", sort_dir: "desc" },
      opts?.signal ? { signal: opts.signal } : undefined,
    );
    const hit = res.data.find((u) => u.uuid.toLowerCase() === want);
    if (hit) return hit;
    totalPages = Math.max(1, res.total_pages ?? 1);
    page += 1;
  }
  return null;
}

export function isUserVpnProvisioned(user: UserResponse): boolean {
  return Boolean(user.vpn_device_uuid?.trim());
}

export function isUserPendingOnboard(user: UserResponse): boolean {
  if (isSuperadminRoleName(user.role)) return false;
  return user.must_change_password !== true;
}

export function isUserOnboardEmailSent(user: UserResponse): boolean {
  if (isSuperadminRoleName(user.role)) return false;
  return user.must_change_password === true;
}

/** Placeholder for POST /api/users — replaced when onboarding email is sent. */
export function generateInternalCreatePassword(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  }
  return `Wpd${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
}

export async function onboardUser(
  userUuid: string,
  request?: { signal?: AbortSignal },
): Promise<UserOnboardResponse> {
  const api = getUsers();
  return api.onboardUserApiUsersUserUuidOnboardPost(
    userUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export function vpnConfigDownloadFilename(email: string): string {
  return `${email}-wireguard-vpn.conf`;
}

export function vpnQrDownloadFilename(email: string): string {
  return `${email}-wireguard-vpn-qr.png`;
}

export async function generateUserVpn(
  userUuid: string,
  opts?: {
    deviceName?: string;
    deviceType?: string;
    signal?: AbortSignal;
  },
): Promise<UserResponse> {
  const api = getUsers();
  return api.generateUserVpnApiUsersGenerateVpnPost(
    {
      user_uuid: userUuid,
      ...(opts?.deviceName ? { device_name: opts.deviceName } : {}),
      ...(opts?.deviceType ? { device_type: opts.deviceType } : {}),
    },
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function revokeUserVpn(
  userUuid: string,
  opts?: { signal?: AbortSignal },
): Promise<UserResponse> {
  const api = getUsers();
  return api.revokeUserVpnApiUsersUserUuidVpnRevokeGet(
    userUuid,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

async function userVpnBlobErrorMessage(
  err: unknown,
  fallback: string,
): Promise<string> {
  if (
    isAxiosError(err) &&
    err.response?.data instanceof Blob
  ) {
    return readBlobErrorDetail(err.response.data, fallback);
  }
  return userApiErrorMessage(err, fallback);
}

export async function downloadUserVpnConfig(
  user: UserResponse,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const api = getUsers();
  try {
    const blob = await api.downloadUserVpnConfigApiUsersUserUuidVpnConfigGet(
      user.uuid,
      opts?.signal ? { signal: opts.signal } : undefined,
    );
    if (!(blob instanceof Blob)) {
      throw new Error("Unexpected VPN config response.");
    }
    triggerBlobDownload(blob, vpnConfigDownloadFilename(user.email));
  } catch (err: unknown) {
    throw new Error(
      await userVpnBlobErrorMessage(err, "Could not download VPN config."),
    );
  }
}

export async function downloadUserVpnQr(
  user: UserResponse,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const api = getUsers();
  try {
    const blob = await api.downloadUserVpnQrApiUsersUserUuidVpnQrGet(
      user.uuid,
      opts?.signal ? { signal: opts.signal } : undefined,
    );
    if (!(blob instanceof Blob)) {
      throw new Error("Unexpected VPN QR response.");
    }
    triggerBlobDownload(blob, vpnQrDownloadFilename(user.email));
  } catch (err: unknown) {
    throw new Error(
      await userVpnBlobErrorMessage(err, "Could not download VPN QR code."),
    );
  }
}

export function userApiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return err instanceof Error ? err.message : fallback;
  const data = err.response?.data as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof (data as { detail: unknown }).detail === "string"
  ) {
    const detail = (data as { detail: string }).detail;
    if (detail.length > 0) return detail;
  }
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
