import { Loader2, Mail } from "lucide-react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useCallback, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import {
  isPasswordFormValid,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-strength";
import { getSessionPasswordFlags } from "@/lib/session-password-flags";
import {
  changePassword,
  type MappedPasswordError,
  requestChangePasswordOtp,
} from "@/services/password-service";
import { AlertCircle } from "lucide-react";

export type ChangePasswordFormProps = {
  mode: "forced" | "voluntary";
  requireOtp?: boolean;
  userInputs?: string[];
  onSuccess?: () => void;
  showCancel?: boolean;
  onCancel?: () => void;
  submitLabel?: string;
};

export function ChangePasswordForm({
  mode,
  requireOtp: requireOtpProp,
  userInputs = [],
  onSuccess,
  showCancel = false,
  onCancel,
  submitLabel,
}: ChangePasswordFormProps) {
  const sessionFlags = getSessionPasswordFlags();
  const requireOtp =
    requireOtpProp ?? sessionFlags.change_password_otp_required;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiresMinutes, setOtpExpiresMinutes] = useState<number | null>(
    null,
  );
  const [otpRequiredFromServer, setOtpRequiredFromServer] = useState(requireOtp);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<MappedPasswordError["field"], string>>
  >({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [strengthValid, setStrengthValid] = useState(false);

  const showOtpStep = otpRequiredFromServer;

  const canSubmit = useMemo(() => {
    if (!currentPassword || currentPassword.length < PASSWORD_MIN_LENGTH) {
      return false;
    }
    if (
      !isPasswordFormValid(newPassword, confirmPassword, userInputs) ||
      !strengthValid
    ) {
      return false;
    }
    if (showOtpStep && otpRequiredFromServer && !otpCode.trim()) {
      return false;
    }
    return true;
  }, [
    confirmPassword,
    currentPassword,
    newPassword,
    otpCode,
    otpRequiredFromServer,
    showOtpStep,
    strengthValid,
    userInputs,
  ]);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setGeneralError(null);
  }, []);

  const applyMappedError = useCallback((error: MappedPasswordError) => {
    if (error.field === "general") {
      setGeneralError(error.message);
      return;
    }
    setFieldErrors({ [error.field]: error.message });
  }, []);

  const handleSendOtp = async () => {
    clearErrors();
    setIsSendingOtp(true);
    try {
      const response = await requestChangePasswordOtp();
      setOtpRequiredFromServer(response.otp_required);
      if (!response.otp_required) {
        setOtpSent(false);
        return;
      }
      setOtpSent(true);
      setOtpExpiresMinutes(response.expires_in_minutes);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "field" in err &&
        "message" in err
      ) {
        applyMappedError(err as MappedPasswordError);
      } else {
        setGeneralError(
          err instanceof Error
            ? err.message
            : "Could not send verification code.",
        );
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    clearErrors();
    setIsSubmitting(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
        ...(showOtpStep && otpCode.trim()
          ? { otp_code: otpCode.trim() }
          : {}),
      });
      onSuccess?.();
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "field" in err &&
        "message" in err
      ) {
        applyMappedError(err as MappedPasswordError);
      } else {
        setGeneralError(
          err instanceof Error ? err.message : "Could not change password.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrentChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearErrors();
    setCurrentPassword(event.target.value);
  };

  const handleNewChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearErrors();
    setNewPassword(event.target.value);
  };

  const handleConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearErrors();
    setConfirmPassword(event.target.value);
  };

  const handleOtpChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearErrors();
    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {mode === "forced" ? (
        <p className="text-muted-foreground text-sm">
          You must set a new password before you can use the application.
        </p>
      ) : null}

      {showOtpStep ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Email verification</p>
              <p className="text-muted-foreground text-xs">
                Request a one-time code sent to your email before updating your
                password.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSendingOtp}
              onClick={() => {
                void handleSendOtp();
              }}
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  {otpSent ? "Resend code" : "Send code"}
                </>
              )}
            </Button>
          </div>
          {otpSent && otpExpiresMinutes !== null ? (
            <p className="text-muted-foreground text-xs">
              Code sent. It expires in {otpExpiresMinutes} minutes.
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="otpCode">Verification code</Label>
            <Input
              id="otpCode"
              name="otpCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={handleOtpChange}
              maxLength={6}
              placeholder="6-digit code"
            />
            {fieldErrors.otp ? (
              <p className="text-destructive text-xs">{fieldErrors.otp}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={handleCurrentChange}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
        />
        {fieldErrors.current ? (
          <p className="text-destructive text-xs">{fieldErrors.current}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={handleNewChange}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
        />
        {fieldErrors.new ? (
          <p className="text-destructive text-xs">{fieldErrors.new}</p>
        ) : null}
        <PasswordStrengthMeter
          password={newPassword}
          confirmPassword={confirmPassword}
          userInputs={userInputs}
          onValidityChange={setStrengthValid}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={handleConfirmChange}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
        />
        {fieldErrors.confirm ? (
          <p className="text-destructive text-xs">{fieldErrors.confirm}</p>
        ) : null}
      </div>

      {generalError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not update password</AlertTitle>
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {showCancel && onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting
            ? "Updating…"
            : (submitLabel ??
              (mode === "forced" ? "Set new password" : "Update password"))}
        </Button>
      </div>
    </form>
  );
}
