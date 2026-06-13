import axios, { type AxiosRequestConfig, isAxiosError } from "axios";

import { PAGES } from "@/endpoints";
import {
  clearAuthenticatedSessionStorage,
  SESSION_ACCESS_TOKEN_KEY,
} from "@/lib/clear-authenticated-session-storage";
import { bootstrapServerDeviceUuidFromStorage } from "@/lib/session-device-uuid";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** When true, a 401 does not clear the session or redirect to login. */
    skipSessionRevokedRedirect?: boolean;
  }
}

/** Result for admin/diagnostic calls that must not trigger session logout. */
export type SafeApiResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

/** @deprecated Use `SafeApiResult` */
export type CriticalAdminDeleteResult<T> = SafeApiResult<T>;

export class SafeApiRequestError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "SafeApiRequestError";
    this.status = status;
    this.data = data;
  }
}

function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return String(window.__WHIRLPOOL_ENV__?.VITE_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
}

const baseURL = resolveApiBaseUrl();

/** API origin used by Orval `apiClient` and ad-hoc `fetch` helpers. */
export function getApiBaseUrl(): string {
  return baseURL;
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const TOKEN_TYPE_KEY = "whirlpool.token_type";

function bootstrapAuthHeaderFromStorage() {
  if (typeof window === "undefined") return;
  const token = window.localStorage.getItem(SESSION_ACCESS_TOKEN_KEY);
  if (!token) return;
  const type =
    window.localStorage.getItem(TOKEN_TYPE_KEY)?.trim() || "Bearer";
  apiClient.defaults.headers.common.Authorization = `${type} ${token}`;
}

bootstrapAuthHeaderFromStorage();
bootstrapServerDeviceUuidFromStorage();

function isPublicAuthRequest(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  return (
    path.endsWith("/version") ||
    path.endsWith("/auth/login") ||
    path.endsWith("/auth/login-token") ||
    path.endsWith("/auth/forgot-password") ||
    path.endsWith("/auth/reset-password") ||
    path.includes("/sso")
  );
}

let handlingSessionRevoked = false;

function redirectToLoginRevoked(): void {
  if (typeof window === "undefined" || handlingSessionRevoked) return;
  handlingSessionRevoked = true;

  clearAuthenticatedSessionStorage();
  Reflect.deleteProperty(apiClient.defaults.headers.common, "Authorization");

  window.location.replace(`${PAGES.LOGIN}?revoked=true`);
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined"
    ) {
      const requestUrl = String(error.config?.url ?? "");
      const hadSession = Boolean(
        window.localStorage.getItem(SESSION_ACCESS_TOKEN_KEY)?.trim(),
      );

      if (
        hadSession &&
        !isPublicAuthRequest(requestUrl) &&
        !error.config?.skipSessionRevokedRedirect
      ) {
        redirectToLoginRevoked();
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Axios call for admin/diagnostic flows (delete tokens, SMTP/S3 tests, etc.).
 * Never triggers session logout on 401; returns status + body for UI display.
 */
export async function safeApiRequest<T>(
  config: AxiosRequestConfig,
): Promise<SafeApiResult<T>> {
  try {
    const response = await apiClient.request<T>({
      ...config,
      skipSessionRevokedRedirect: true,
    });
    return { ok: true, status: response.status, data: response.data };
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return {
        ok: false,
        status: error.response.status,
        data: error.response.data as T,
      };
    }
    throw error;
  }
}

/**
 * Permanent facility delete (plants/warehouses). Never triggers session logout on
 * 401 (invalid delete token); always returns status + body for UI display.
 */
export async function criticalAdminDeleteRequest<T>(
  path: string,
  criticalAdminDeleteToken: string,
  request?: { signal?: AbortSignal },
): Promise<SafeApiResult<T>> {
  return safeApiRequest<T>({
    url: path,
    method: "DELETE",
    headers: {
      "x-critical-admin-delete-token": criticalAdminDeleteToken,
    },
    signal: request?.signal,
  });
}

/**
 * Orval axios mutator — returns response body (unwraps axios `data`).
 */
export function customInstance<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  return apiClient<T>({
    ...config,
    ...options,
  }).then((response) => response.data);
}
