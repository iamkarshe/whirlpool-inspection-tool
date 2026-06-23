import { isNonProductionAppHost } from "@/lib/app-environment";

const PENDING_AFTER_LOGIN_KEY = "whirlpool.uat-notice.pending-login";

export function markUatNoticeAfterLogin(): void {
  if (typeof window === "undefined" || !isNonProductionAppHost()) return;
  window.sessionStorage.setItem(PENDING_AFTER_LOGIN_KEY, "1");
}

export function consumeUatNoticeAfterLogin(): boolean {
  if (typeof window === "undefined") return false;
  const pending = window.sessionStorage.getItem(PENDING_AFTER_LOGIN_KEY) === "1";
  if (pending) window.sessionStorage.removeItem(PENDING_AFTER_LOGIN_KEY);
  return pending;
}
