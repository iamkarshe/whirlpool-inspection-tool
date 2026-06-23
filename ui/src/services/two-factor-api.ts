import { isAxiosError } from "axios";

import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { LoginResponse } from "@/api/generated/model/loginResponse";
import type { TwoFactorConfirmResponse } from "@/api/generated/model/twoFactorConfirmResponse";
import type { TwoFactorDisableResponse } from "@/api/generated/model/twoFactorDisableResponse";
import type { TwoFactorResetResponse } from "@/api/generated/model/twoFactorResetResponse";
import type { TwoFactorSetupStartResponse } from "@/api/generated/model/twoFactorSetupStartResponse";
import type { TwoFactorStatusResponse } from "@/api/generated/model/twoFactorStatusResponse";
import { getAuth } from "@/api/generated/auth/auth";
import { getUsers } from "@/api/generated/users/users";

function extractApiDetailMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("detail" in data)) {
    return null;
  }
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail.trim();
  }
  if (Array.isArray(detail)) {
    const first = (detail as HTTPValidationError["detail"])?.[0]?.msg ??
      (detail as HTTPValidationError["detail"])?.[0]?.type;
    if (typeof first === "string" && first.length > 0) return first;
  }
  return null;
}

export function twoFactorApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (!isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback;
  }
  const status = err.response?.status;
  const detailMessage = extractApiDetailMessage(err.response?.data);
  if (detailMessage) return detailMessage;
  if (status === 401) return "Invalid authenticator code or password.";
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (typeof status === "number") return `${fallback} (HTTP ${status}).`;
  if (typeof err.message === "string" && err.message.length > 0) {
    return err.message;
  }
  return fallback;
}

export function normalizeTotpCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isValidTotpCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export async function verifyLoginTwoFactor(
  mfaPendingToken: string,
  totpCode: string,
): Promise<LoginResponse> {
  const auth = getAuth();
  try {
    return await auth.loginVerifyTwoFactorAuthLoginVerify2faPost({
      mfa_pending_token: mfaPendingToken.trim(),
      totp_code: normalizeTotpCode(totpCode),
    });
  } catch (err: unknown) {
    throw new Error(
      twoFactorApiErrorMessage(err, "Could not verify authenticator code."),
    );
  }
}

export async function startLoginTwoFactorSetup(
  mfaPendingToken: string,
): Promise<TwoFactorSetupStartResponse> {
  const auth = getAuth();
  try {
    return await auth.loginStartTwoFactorSetupAuthLogin2faSetupPost({
      mfa_pending_token: mfaPendingToken.trim(),
    });
  } catch (err: unknown) {
    throw new Error(
      twoFactorApiErrorMessage(err, "Could not start two-factor setup."),
    );
  }
}

export async function fetchTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
  const auth = getAuth();
  try {
    return await auth.getTwoFactorStatusAuth2faStatusGet();
  } catch (err: unknown) {
    throw new Error(
      twoFactorApiErrorMessage(err, "Could not load two-factor status."),
    );
  }
}

export async function startTwoFactorSetup(): Promise<TwoFactorSetupStartResponse> {
  const auth = getAuth();
  try {
    return await auth.startTwoFactorSetupAuth2faSetupPost();
  } catch (err: unknown) {
    throw new Error(
      twoFactorApiErrorMessage(err, "Could not start two-factor setup."),
    );
  }
}

export async function confirmTwoFactorSetup(
  totpCode: string,
): Promise<TwoFactorConfirmResponse> {
  const auth = getAuth();
  try {
    return await auth.confirmTwoFactorSetupAuth2faConfirmPost({
      totp_code: normalizeTotpCode(totpCode),
    });
  } catch (err: unknown) {
    throw new Error(
      twoFactorApiErrorMessage(err, "Could not confirm two-factor setup."),
    );
  }
}

export async function disableTwoFactor(
  totpCode: string,
): Promise<TwoFactorDisableResponse> {
  const auth = getAuth();
  try {
    return await auth.disableTwoFactorAuth2faDisablePost({
      totp_code: normalizeTotpCode(totpCode),
    });
  } catch (err: unknown) {
    throw new Error(
      twoFactorApiErrorMessage(err, "Could not disable two-factor authentication."),
    );
  }
}

export async function resetOwnTwoFactor(
  currentPassword: string,
): Promise<TwoFactorResetResponse> {
  const auth = getAuth();
  try {
    return await auth.resetTwoFactorSelfAuth2faResetPost({
      current_password: currentPassword,
    });
  } catch (err: unknown) {
    throw new Error(
      twoFactorApiErrorMessage(err, "Could not reset two-factor authentication."),
    );
  }
}

export async function resetUserTwoFactor(
  userUuid: string,
): Promise<TwoFactorResetResponse> {
  const users = getUsers();
  try {
    return await users.resetUserTwoFactorApiUsersUserUuidReset2faPost(
      userUuid.trim(),
    );
  } catch (err: unknown) {
    throw new Error(
      twoFactorApiErrorMessage(
        err,
        "Could not reset two-factor authentication for this user.",
      ),
    );
  }
}
