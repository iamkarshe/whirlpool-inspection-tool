import { getAuth } from "@/api/generated/auth/auth";
import type { ChangePasswordRequest } from "@/api/generated/model/changePasswordRequest";
import type { ChangePasswordOtpResponse } from "@/api/generated/model/changePasswordOtpResponse";
import type { ChangePasswordResponse } from "@/api/generated/model/changePasswordResponse";
import type { ForgotPasswordRequest } from "@/api/generated/model/forgotPasswordRequest";
import type { ForgotPasswordResponse } from "@/api/generated/model/forgotPasswordResponse";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { ResetPasswordRequest } from "@/api/generated/model/resetPasswordRequest";
import type { ResetPasswordResponse } from "@/api/generated/model/resetPasswordResponse";
import { isAxiosError } from "axios";

export type PasswordFieldError = "current" | "new" | "confirm" | "otp" | "general";

export type MappedPasswordError = {
  field: PasswordFieldError;
  message: string;
};

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

export function mapPasswordApiError(
  detail: string,
): MappedPasswordError {
  const normalized = detail.trim();
  const lower = normalized.toLowerCase();

  if (
    lower.includes("cannot match your current") ||
    lower.includes("last 3 passwords") ||
    lower.includes("reuse")
  ) {
    return {
      field: "new",
      message: "Cannot reuse recent passwords.",
    };
  }
  if (lower.includes("must be different from your current")) {
    return {
      field: "new",
      message: "New password must be different from your current password.",
    };
  }
  if (lower.includes("do not match") || lower.includes("must match")) {
    return {
      field: "confirm",
      message: "Password and confirm password do not match.",
    };
  }
  if (
    lower.includes("verification code is required") ||
    lower.includes("otp")
  ) {
    return {
      field: "otp",
      message: "Email verification code is required. Request a code first.",
    };
  }
  if (
    lower.includes("invalid or expired verification") ||
    lower.includes("invalid otp")
  ) {
    return {
      field: "otp",
      message: "Invalid or expired verification code.",
    };
  }
  if (
    lower.includes("too weak") ||
    lower.includes("password is too weak") ||
    lower.includes("zxcvbn")
  ) {
    return {
      field: "new",
      message: normalized,
    };
  }
  if (
    lower.includes("current password") ||
    lower.includes("wrong password") ||
    lower.includes("invalid credentials")
  ) {
    return {
      field: "current",
      message: "Current password is incorrect.",
    };
  }

  return { field: "general", message: normalized };
}

function normalizePasswordError(
  err: unknown,
  fallback: string,
): MappedPasswordError {
  if (!isAxiosError(err)) {
    const message = err instanceof Error ? err.message : fallback;
    return { field: "general", message };
  }

  const status = err.response?.status;
  const detailMessage = extractApiDetailMessage(err.response?.data);

  if (status === 429) {
    const retryAfter = err.response?.headers?.["retry-after"];
    const retryHint =
      typeof retryAfter === "string" && retryAfter.trim().length > 0
        ? ` Try again in ${retryAfter} seconds.`
        : " Please wait and try again.";
    return {
      field: "general",
      message: `Too many attempts.${retryHint}`,
    };
  }

  if (status === 503) {
    return {
      field: "general",
      message: "Email could not be sent. Try again later.",
    };
  }

  if (detailMessage) {
    return mapPasswordApiError(detailMessage);
  }

  if (status === 401 || status === 403) {
    return {
      field: "current",
      message: "Current password is incorrect.",
    };
  }

  if (typeof err.message === "string" && err.message.length > 0) {
    return { field: "general", message: err.message };
  }

  return {
    field: "general",
    message: status ? `${fallback} (HTTP ${status}).` : fallback,
  };
}

export async function forgotPassword(
  email: string,
): Promise<ForgotPasswordResponse> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error("Email is required.");
  }

  try {
    const auth = getAuth();
    const payload: ForgotPasswordRequest = { email: trimmedEmail };
    return await auth.forgotPasswordAuthForgotPasswordPost(payload);
  } catch (err: unknown) {
    const mapped = normalizePasswordError(
      err,
      "Could not send reset link.",
    );
    throw mapped;
  }
}

export async function resetPassword(
  payload: ResetPasswordRequest,
): Promise<ResetPasswordResponse> {
  try {
    const auth = getAuth();
    return await auth.resetPasswordAuthResetPasswordPost(payload);
  } catch (err: unknown) {
    const mapped = normalizePasswordError(err, "Could not reset password.");
    throw mapped;
  }
}

export async function requestChangePasswordOtp(): Promise<ChangePasswordOtpResponse> {
  try {
    const auth = getAuth();
    return await auth.requestChangePasswordOtpAuthChangePasswordRequestOtpPost();
  } catch (err: unknown) {
    const mapped = normalizePasswordError(
      err,
      "Could not send verification code.",
    );
    throw mapped;
  }
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<ChangePasswordResponse> {
  try {
    const auth = getAuth();
    return await auth.changePasswordAuthChangePasswordPost(payload);
  } catch (err: unknown) {
    const mapped = normalizePasswordError(err, "Could not change password.");
    throw mapped;
  }
}
