import axios, { type AxiosRequestConfig } from "axios";

const baseURL = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const TOKEN_KEY = "whirlpool.access_token";
const TOKEN_TYPE_KEY = "whirlpool.token_type";

function bootstrapAuthHeaderFromStorage() {
  if (typeof window === "undefined") return;
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  const type =
    window.localStorage.getItem(TOKEN_TYPE_KEY)?.trim() || "Bearer";
  apiClient.defaults.headers.common.Authorization = `${type} ${token}`;
}

bootstrapAuthHeaderFromStorage();

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
