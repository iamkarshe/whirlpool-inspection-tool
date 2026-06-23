import { Loader2 } from "lucide-react";
import type { SubmitEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { LoginResponse } from "@/api/generated/model/loginResponse";
import { DeviceSelectionDialog } from "@/components/auth/device-selection-dialog";
import { TotpCodeInput } from "@/components/auth/totp-code-input";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGES } from "@/endpoints";
import {
  clearPendingMfaState,
  readPendingMfaState,
} from "@/lib/pending-mfa-state";
import { persistPendingLoginForPasswordChange } from "@/lib/pending-login-state";
import AuthLayout from "@/pages/auth/layout";
import {
  loginRequiresPasswordChange,
  persistAuthenticatedSession,
  resolvePostLoginHref,
  shouldShowDeviceSelection,
} from "@/services/login-service";
import {
  isValidTotpCode,
  verifyLoginTwoFactor,
} from "@/services/two-factor-api";

export default function TwoFactorVerifyPage() {
  const navigate = useNavigate();
  const pending = readPendingMfaState();
  const [totpCode, setTotpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<LoginResponse | null>(null);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);

  useEffect(() => {
    if (!pending || pending.mfa_setup_required) {
      navigate(PAGES.LOGIN, { replace: true });
    }
  }, [navigate, pending]);

  const finishLoginNavigation = useCallback(
    (login: LoginResponse) => {
      toast.success(`Welcome back, ${login.name}.`);
      navigate(resolvePostLoginHref(login.role), { replace: true });
    },
    [navigate],
  );

  const completeLogin = useCallback(
    (login: LoginResponse) => {
      clearPendingMfaState();
      persistAuthenticatedSession(login);

      if (loginRequiresPasswordChange(login)) {
        persistPendingLoginForPasswordChange(login);
        toast.info("Set a new password to continue.");
        navigate(PAGES.CHANGE_PASSWORD, { replace: true });
        return;
      }

      if (shouldShowDeviceSelection(login)) {
        setPendingLogin(login);
        setDeviceDialogOpen(true);
        return;
      }

      finishLoginNavigation(login);
    },
    [finishLoginNavigation, navigate],
  );

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!pending || !isValidTotpCode(totpCode) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const login = await verifyLoginTwoFactor(
        pending.mfa_pending_token,
        totpCode,
      );
      completeLogin(login);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Verification failed. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pending || pending.mfa_setup_required) {
    return (
      <AuthLayout title="Sign in">
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Authenticator code">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-10">
            <BrandLogo />
          </div>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app for{" "}
            <span className="font-medium text-foreground">{pending.email}</span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <TotpCodeInput value={totpCode} onChange={setTotpCode} disabled={isSubmitting} />
            <Button
              type="submit"
              className="w-full"
              disabled={!isValidTotpCode(totpCode) || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify and sign in"
              )}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            Lost your authenticator?{" "}
            <span className="block">
              Ask a superadmin to reset your 2FA, or sign in with an active
              session and reset it from Settings.
            </span>
          </p>
          <div className="mt-4 text-center">
            <Button asChild variant="link" className="text-sm">
              <Link to={PAGES.LOGIN}>Back to sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeviceSelectionDialog
        open={deviceDialogOpen}
        login={pendingLogin}
        onResolved={() => {
          if (!pendingLogin) return;
          const login = pendingLogin;
          setPendingLogin(null);
          setDeviceDialogOpen(false);
          finishLoginNavigation(login);
        }}
        onCancel={() => {
          setPendingLogin(null);
          setDeviceDialogOpen(false);
          navigate(PAGES.LOGIN, { replace: true });
          toast.info("Sign-in cancelled.");
        }}
      />
    </AuthLayout>
  );
}
