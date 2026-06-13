import { Loader2 } from "lucide-react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGES } from "@/endpoints";
import AuthLayout from "@/pages/auth/layout";
import {
  isPasswordFormValid,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-strength";
import { clearAuthenticatedSession } from "@/services/login-service";
import {
  resetPassword,
  type MappedPasswordError,
} from "@/services/password-service";
import { AlertCircle } from "lucide-react";

function ResetPasswordConfirmation() {
  return (
    <AuthLayout title="Check your email">
      <Card className="mx-auto w-full max-w-96 sm:w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            If an account exists for this email, we&apos;ve sent a password reset
            link. Please check your inbox and follow the instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Remember to check your spam folder or
            try again after a few minutes.
          </p>
          <Button type="button" asChild className="w-full">
            <Link to={PAGES.LOGIN}>Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [strengthValid, setStrengthValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      strengthValid &&
      isPasswordFormValid(password, confirmPassword) &&
      token.trim().length >= 16,
    [confirmPassword, password, strengthValid, token],
  );

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFieldError(null);
    setGeneralError(null);
    setPassword(event.target.value);
  };

  const handleConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFieldError(null);
    setGeneralError(null);
    setConfirmPassword(event.target.value);
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setFieldError(null);
    setGeneralError(null);
    try {
      await resetPassword({
        token: token.trim(),
        password,
        confirm_password: confirmPassword,
      });
      clearAuthenticatedSession();
      toast.success("Password reset. Sign in with your new password.");
      navigate(PAGES.LOGIN, { replace: true });
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "field" in err &&
        "message" in err
      ) {
        const mapped = err as MappedPasswordError;
        if (mapped.field === "new" || mapped.field === "confirm") {
          setFieldError(mapped.message);
        } else {
          setGeneralError(mapped.message);
        }
      } else {
        setGeneralError(
          err instanceof Error ? err.message : "Could not reset password.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Reset password">
      <Card className="mx-auto w-full max-w-lg sm:w-full">
        <CardHeader>
          <BrandLogo />
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <CardDescription>
            Enter a strong password for your account. All existing sessions will
            be signed out after the reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={handlePasswordChange}
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                required
              />
              {fieldError ? (
                <p className="text-destructive text-xs">{fieldError}</p>
              ) : null}
              <PasswordStrengthMeter
                password={password}
                confirmPassword={confirmPassword}
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
            </div>

            {generalError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Could not reset password</AlertTitle>
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Resetting…
                </>
              ) : (
                "Reset password"
              )}
            </Button>

            <div className="text-center text-sm">
              <Link to={PAGES.LOGIN} className="underline">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  if (token) {
    return <ResetPasswordForm token={token} />;
  }

  return <ResetPasswordConfirmation />;
}
