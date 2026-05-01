import { isAxiosError } from "axios";
import type { GetUsersApiUsersGetParams } from "@/api/generated/model/getUsersApiUsersGetParams";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { UserCreateRequest } from "@/api/generated/model/userCreateRequest";
import type { UserUpdateRequest } from "@/api/generated/model/userUpdateRequest";
import {
  UserCreateRequestRole,
  type UserCreateRequestRole,
} from "@/api/generated/model/userCreateRequestRole";
import type { UserListResponse } from "@/api/generated/model/userListResponse";
import type { UserResponse } from "@/api/generated/model/userResponse";
import { getUsers } from "@/api/generated/users/users";
import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";

const CREATABLE_USER_ROLES: ReadonlySet<UserCreateRequestRole> = new Set([
  UserCreateRequestRole.operator,
  UserCreateRequestRole.manager,
]);

/** Superadmins cannot be managed through admin create/update/delete UI. */
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
    throw new Error("Only manager and operator accounts can be created here.");
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
    throw new Error("Only manager and operator roles can be assigned here.");
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

export function userApiErrorMessage(err: unknown, fallback: string): string {
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
