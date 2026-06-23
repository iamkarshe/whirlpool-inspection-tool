const PENDING_MFA_KEY = "whirlpool.pending_mfa";

export type PendingMfaState = {
  mfa_pending_token: string;
  mfa_setup_required: boolean;
  mfa_required: boolean;
  name: string;
  email: string;
};

export function persistPendingMfaState(state: PendingMfaState): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_MFA_KEY, JSON.stringify(state));
}

export function readPendingMfaState(): PendingMfaState | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_MFA_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingMfaState>;
    const token = parsed.mfa_pending_token?.trim();
    if (
      !token ||
      typeof parsed.name !== "string" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }
    return {
      mfa_pending_token: token,
      mfa_setup_required: parsed.mfa_setup_required === true,
      mfa_required: parsed.mfa_required === true,
      name: parsed.name,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export function clearPendingMfaState(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_MFA_KEY);
}
