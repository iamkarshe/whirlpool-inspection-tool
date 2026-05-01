import { useSyncExternalStore } from "react";

import { WHIRLPOOL_SESSION_CHANGED_EVENT } from "@/lib/session-events";

const SESSION_USER_PAYLOAD_KEY = "whirlpool.user";

export type SessionUser = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: string;
  designation: string | null;
  is_active: boolean;
};

let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

function readSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_USER_PAYLOAD_KEY);
  if (raw === cachedRaw) return cachedUser;
  cachedRaw = raw;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.email === "string" &&
      typeof parsed.uuid === "string"
    ) {
      cachedUser = {
        id: typeof parsed.id === "number" ? parsed.id : 0,
        uuid: parsed.uuid,
        name: parsed.name,
        email: parsed.email,
        role: typeof parsed.role === "string" ? parsed.role : "",
        designation:
          typeof parsed.designation === "string" ? parsed.designation : null,
        is_active: typeof parsed.is_active === "boolean" ? parsed.is_active : true,
      };
      return cachedUser;
    }
  } catch {
    cachedUser = null;
    return null;
  }
  cachedUser = null;
  return null;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === SESSION_USER_PAYLOAD_KEY ||
      event.key === null ||
      event.key === "whirlpool.access_token"
    ) {
      cachedRaw = null;
      cachedUser = null;
      onStoreChange();
    }
  };
  const onSessionChanged = () => {
    cachedRaw = null;
    cachedUser = null;
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(WHIRLPOOL_SESSION_CHANGED_EVENT, onSessionChanged);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(WHIRLPOOL_SESSION_CHANGED_EVENT, onSessionChanged);
  };
}

export function useSessionUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, readSessionUser, () => null);
}

