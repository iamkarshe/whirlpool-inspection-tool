export type { LoginActivity, LoginKpis } from "@/pages/dashboard/admin/logins/login-types";

import type { LoginActivity, LoginKpis } from "@/pages/dashboard/admin/logins/login-types";
import {
  fetchLoginsByUserHints,
  fetchLoginKpis,
} from "@/services/logins-api";

export async function getLoginKpis(): Promise<LoginKpis> {
  return fetchLoginKpis();
}

export async function getLoginsByUserHints(
  hints: { email?: string | null; name?: string },
  request?: { signal?: AbortSignal },
): Promise<LoginActivity[]> {
  return fetchLoginsByUserHints(hints, request);
}
