import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { LoginResponse } from "@/api/generated/model/loginResponse";
import type { TwoFactorSetupStartResponse } from "@/api/generated/model/twoFactorSetupStartResponse";
import { DeviceSelectionDialog } from "@/components/auth/device-selection-dialog";
import { TwoFactorSetupPanel } from "@/components/auth/two-factor-setup-panel";
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
  startLoginTwoFactorSetup,
  verifyLoginTwoFactor,
} from "@/services/two-factor-api";

export default function TwoFactorSetupLoginPage() {
  const navigate = useNavigate();
  const pending = readPendingMfaState();
  const [setup, setSetup] = useState<TwoFactorSetupStartResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<LoginResponse | null>(null);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);

  useEffect(() => {
    if (!pending || !pending.mfa_setup_required) {
      navigate(PAGES.LOGIN, { replace: true });
    }
  }, [navigate, pending]);

  useEffect(() => {
    if (!pending?.mfa_pending_token) return;
    let cancelled = false;
    queueMicrotask(() => {
      setIsLoadingSetup(true);
      setSetupError(null);
    });
    startLoginTwoFactorSetup(pending.mfa_pending_token)
      .then((response) => {
        if (!cancelled) setSetup(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSetupError(
            err instanceof Error ? err.message : "Could not start 2FA setup.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSetup(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pending?.mfa_pending_token]);

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

  const handleConfirm = async (totpCode: string) => {
    if (!pending) return;
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

  if (!pending || !pending.mfa_setup_required) {
    return (
      <AuthLayout title="Sign in">
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set up two-factor authentication">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-10">
            <BrandLogo />
          </div>
          <CardTitle>Set up two-factor authentication</CardTitle>
          <CardDescription>
            Your administrator requires 2FA for{" "}
            <span className="font-medium text-foreground">{pending.email}</span>.
            Pair an authenticator app, then enter the first code to finish
            signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSetup ? (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Preparing setup…
            </div>
          ) : setupError ? (
            <div className="space-y-4 text-center">
              <p className="text-destructive text-sm">{setupError}</p>
              <Button asChild variant="outline">
                <Link to={PAGES.LOGIN}>Back to sign in</Link>
              </Button>
            </div>
          ) : setup ? (
            <TwoFactorSetupPanel
              setup={setup}
              email={pending.email}
              isSubmitting={isSubmitting}
              submitLabel="Verify and sign in"
              onSubmit={handleConfirm}
            />
          ) : null}
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
