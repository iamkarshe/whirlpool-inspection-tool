import { Loader2, RefreshCcw } from "lucide-react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import type { LoginResponse } from "@/api/generated/model/loginResponse";
import type { VersionResponse } from "@/api/generated/model/versionResponse";
import { DeviceSelectionDialog } from "@/components/auth/device-selection-dialog";
import { RevokedSessionDialog } from "@/components/auth/revoked-session-dialog";
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
import { cn } from "@/lib/utils";
import { PAGES } from "@/endpoints";
import { useGeolocation } from "@/hooks/use-geolocation";
import AuthLayout from "@/pages/auth/layout";
import { VpnAccessLock } from "@/pages/auth/vpn-access-lock";
import {
  fetchAppVersion,
  normalizeVersionCheckError,
} from "@/services/app-version";
import {
  LOGIN_PASSWORD_MAX_LENGTH,
  LOGIN_PASSWORD_MIN_LENGTH,
  authenticateWithEmailPassword,
  authenticateWithSsoExchangeToken,
  clearAuthenticatedSession,
  loginRequiresMfaSetup,
  loginRequiresMfaVerification,
  loginRequiresPasswordChange,
  persistAuthenticatedSession,
  resolvePostLoginHref,
  shouldShowDeviceSelection,
} from "@/services/login-service";
import { persistPendingLoginForPasswordChange } from "@/lib/pending-login-state";
import { persistPendingMfaState } from "@/lib/pending-mfa-state";

const ALLOW_FORGOT_PASSWORD = true;

type AccessGateState = "checking" | "allowed" | "blocked" | "error";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLocationReady, coordinatesRef, acquireLocation } = useGeolocation();

  const ssoTokenCapturedRef = useRef<string | null>(null);
  const ssoAttemptRef = useRef<string | null>(null);
  const [ssoFlowActive, setSsoFlowActive] = useState(false);
  const [isCompletingSso, setIsCompletingSso] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("token")?.trim();
    if (!fromUrl) return;
    ssoTokenCapturedRef.current = fromUrl;
    setSsoFlowActive(true);
    navigate(PAGES.LOGIN, { replace: true });
  }, [searchParams, navigate]);

  const [accessGate, setAccessGate] = useState<AccessGateState>("checking");
  const [versionInfo, setVersionInfo] = useState<VersionResponse | null>(null);
  const [accessCheckError, setAccessCheckError] = useState<string | null>(null);
  const [isRecheckingAccess, setIsRecheckingAccess] = useState(false);

  const [email, setEmail] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_EMAIL : "",
  );
  const [password, setPassword] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_PASSWORD : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirectingToOkta, setIsRedirectingToOkta] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<LoginResponse | null>(null);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);

  const isRevokedSession = searchParams.get("revoked") === "true";

  const acknowledgeRevokedSession = useCallback(() => {
    navigate(PAGES.LOGIN, { replace: true });
  }, [navigate]);

  const finishLoginNavigation = useCallback(
    (login: LoginResponse) => {
      toast.success(`Welcome back, ${login.name}.`);
      navigate(resolvePostLoginHref(login.role), { replace: true });
    },
    [navigate],
  );

  const handlePostAuthenticate = useCallback(
    (login: LoginResponse) => {
      if (loginRequiresMfaSetup(login)) {
        persistPendingMfaState({
          mfa_pending_token: login.mfa_pending_token!.trim(),
          mfa_setup_required: true,
          mfa_required: false,
          name: login.name,
          email: login.email,
        });
        navigate(PAGES.LOGIN_2FA_SETUP, { replace: true });
        return;
      }

      if (loginRequiresMfaVerification(login)) {
        persistPendingMfaState({
          mfa_pending_token: login.mfa_pending_token!.trim(),
          mfa_setup_required: false,
          mfa_required: true,
          name: login.name,
          email: login.email,
        });
        navigate(PAGES.LOGIN_2FA_VERIFY, { replace: true });
        return;
      }

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

  const handleDeviceSelectionResolved = useCallback(() => {
    if (!pendingLogin) return;
    const login = pendingLogin;
    setPendingLogin(null);
    setDeviceDialogOpen(false);
    finishLoginNavigation(login);
  }, [pendingLogin, finishLoginNavigation]);

  const handleDeviceSelectionCancel = useCallback(() => {
    clearAuthenticatedSession();
    setPendingLogin(null);
    setDeviceDialogOpen(false);
    toast.info("Sign-in cancelled.");
  }, []);

  const runAccessCheck = useCallback(async (force = false) => {
    setAccessCheckError(null);
    try {
      const version = await fetchAppVersion(force ? { force: true } : undefined);
      setVersionInfo(version);

      if (!version.can_access_app) {
        clearAuthenticatedSession();
        setAccessGate("blocked");
        return;
      }

      setAccessGate("allowed");
    } catch (err: unknown) {
      setAccessCheckError(normalizeVersionCheckError(err));
      setAccessGate("error");
    }
  }, []);

  useEffect(() => {
    void runAccessCheck();
  }, [runAccessCheck]);

  useEffect(() => {
    if (accessGate !== "allowed") return;
    void acquireLocation();
  }, [accessGate, acquireLocation]);

  useEffect(() => {
    const token = ssoTokenCapturedRef.current;
    if (accessGate !== "allowed" || !token) return;
    if (ssoAttemptRef.current === token) return;
    ssoAttemptRef.current = token;

    let cancelled = false;

    const completeSsoLogin = async () => {
      setIsCompletingSso(true);
      try {
        const coords = coordinatesRef.current ?? (await acquireLocation());
        if (!coords) {
          throw new Error("Allow location access to complete Okta sign-in.");
        }

        const session = await authenticateWithSsoExchangeToken(token, coords);
        if (cancelled) return;

        ssoTokenCapturedRef.current = null;
        setSsoFlowActive(false);
        handlePostAuthenticate(session);
      } catch (err: unknown) {
        if (cancelled) return;
        ssoAttemptRef.current = null;
        ssoTokenCapturedRef.current = null;
        setSsoFlowActive(false);
        const message =
          err instanceof Error
            ? err.message
            : "Okta sign-in failed. Try again.";
        toast.error(message);
      } finally {
        if (!cancelled) setIsCompletingSso(false);
      }
    };

    void completeSsoLogin();

    return () => {
      cancelled = true;
    };
  }, [accessGate, acquireLocation, coordinatesRef, handlePostAuthenticate]);

  const handleRetryAccessCheck = async () => {
    setIsRecheckingAccess(true);
    setAccessGate("checking");
    await runAccessCheck(true);
    setIsRecheckingAccess(false);
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (isSubmitting || accessGate !== "allowed") return;

    const coords = coordinatesRef.current ?? (await acquireLocation());
    if (!coords) {
      toast.error("Allow location access before signing in.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Email is required.");
      return;
    }
    if (!password || password.length < LOGIN_PASSWORD_MIN_LENGTH) {
      toast.error(
        `Password must be at least ${LOGIN_PASSWORD_MIN_LENGTH} characters.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const session: LoginResponse = await authenticateWithEmailPassword(
        trimmedEmail,
        password,
        coords,
      );
      handlePostAuthenticate(session);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardLockClass = useMemo(
    () =>
      isLocationReady
        ? ""
        : "pointer-events-none select-none opacity-[0.38] saturate-0",
    [isLocationReady],
  );

  const redirectOktaSSO = () => {
    if (accessGate !== "allowed" || isRedirectingToOkta) return;
    setIsRedirectingToOkta(true);
    const url = String(import.meta.env["VITE_API_BASE_URL"]).concat("/sso");
    window.location.href = url;
  };

  const deviceSelectionDialog = (
    <DeviceSelectionDialog
      open={deviceDialogOpen}
      login={pendingLogin}
      onResolved={handleDeviceSelectionResolved}
      onCancel={handleDeviceSelectionCancel}
    />
  );

  const revokedSessionDialog = (
    <RevokedSessionDialog
      open={isRevokedSession}
      onAcknowledge={acknowledgeRevokedSession}
    />
  );

  if (accessGate === "checking") {
    return (
      <>
        {deviceSelectionDialog}
        {revokedSessionDialog}
        <AuthLayout title="Login">
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p className="text-sm">
            {ssoFlowActive
              ? "Preparing Okta sign-in…"
              : "Verifying network access…"}
          </p>
        </div>
      </AuthLayout>
      </>
    );
  }

  if (accessGate === "blocked") {
    return (
      <>
        {deviceSelectionDialog}
        {revokedSessionDialog}
        <AuthLayout title="Access restricted">
        <VpnAccessLock
          appName={versionInfo?.message}
          apiVersion={versionInfo?.version}
          isRetrying={isRecheckingAccess}
          onRetry={() => {
            void handleRetryAccessCheck();
          }}
        />
      </AuthLayout>
      </>
    );
  }

  if (isCompletingSso || ssoFlowActive) {
    return (
      <>
        {deviceSelectionDialog}
        {revokedSessionDialog}
        <AuthLayout title="Login">
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p className="text-sm">Completing Okta sign-in…</p>
        </div>
      </AuthLayout>
      </>
    );
  }

  if (accessGate === "error") {
    return (
      <>
        {deviceSelectionDialog}
        {revokedSessionDialog}
        <AuthLayout title="Login">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <BrandLogo />
            <CardTitle className="text-2xl">Cannot verify access</CardTitle>
            <CardDescription>
              {accessCheckError ??
                "We could not confirm whether this network may use the app."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isRecheckingAccess}
              onClick={() => {
                void handleRetryAccessCheck();
              }}
            >
              {isRecheckingAccess ? (
                <>
                  <Loader2 className="animate-spin" />
                  Retrying…
                </>
              ) : (
                <>
                  <RefreshCcw />
                  Try again
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
      </>
    );
  }

  return (
    <>
      {deviceSelectionDialog}
      {revokedSessionDialog}
      <AuthLayout title="Login">
      <div className={cn("mx-auto w-full max-w-96 sm:w-96", cardLockClass)}>
        <Card className="w-full">
          <CardHeader>
            <BrandLogo />
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  autoComplete="email"
                  placeholder="user@whirlpool.com"
                  disabled={!isLocationReady}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>

                  {ALLOW_FORGOT_PASSWORD && (
                    <Link
                      to={PAGES.FORGOT_PASSWORD}
                      className="ml-auto inline-block text-sm underline"
                    >
                      Forgot your password?
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  minLength={LOGIN_PASSWORD_MIN_LENGTH}
                  maxLength={LOGIN_PASSWORD_MAX_LENGTH}
                  disabled={!isLocationReady}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!isLocationReady || isSubmitting}
              >
                {isSubmitting ? "Signing in…" : "Login"}
              </Button>

              <div className="my-4">
                <div className="flex items-center gap-3">
                  <div className="w-full border-t" />
                  <span className="text-muted-foreground shrink-0 text-sm">
                    or continue with
                  </span>
                  <div className="w-full border-t" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  disabled={
                    !isLocationReady || isSubmitting || isRedirectingToOkta
                  }
                  onClick={redirectOktaSSO}
                >
                  {isRedirectingToOkta ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    "Okta SSO Login"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
    </>
  );
}
