import axios, { type AxiosRequestConfig, isAxiosError } from "axios";

import { PAGES } from "@/endpoints";
import {
  clearAuthenticatedSessionStorage,
  SESSION_ACCESS_TOKEN_KEY,
} from "@/lib/clear-authenticated-session-storage";
import { bootstrapServerDeviceUuidFromStorage } from "@/lib/session-device-uuid";

function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return String(window.__WHIRLPOOL_ENV__?.VITE_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
}

const baseURL = resolveApiBaseUrl();

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

      if (hadSession && !isPublicAuthRequest(requestUrl)) {
        redirectToLoginRevoked();
      }
    }

    return Promise.reject(error);
  },
);

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
