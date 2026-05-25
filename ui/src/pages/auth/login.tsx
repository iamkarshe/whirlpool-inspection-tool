import { Loader2, RefreshCcw } from "lucide-react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import type { LoginResponse } from "@/api/generated/model/loginResponse";
import type { VersionResponse } from "@/api/generated/model/versionResponse";
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
  clearAuthenticatedSession,
  loginWithEmailPassword,
  loginWithSsoExchangeToken,
  resolvePostLoginHref,
} from "@/services/login-service";

const ALLOW_FORGOT_PASSWORD = false;

type AccessGateState = "checking" | "allowed" | "blocked" | "error";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLocationReady, coordinatesRef, acquireLocation } = useGeolocation();

  const ssoExchangeToken = useMemo(
    () => searchParams.get("token")?.trim() || null,
    [searchParams],
  );
  const ssoAttemptRef = useRef<string | null>(null);
  const [isCompletingSso, setIsCompletingSso] = useState(false);

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

  const runAccessCheck = useCallback(async () => {
    setAccessCheckError(null);
    try {
      const version = await fetchAppVersion();
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
    if (accessGate !== "allowed" || !ssoExchangeToken) return;
    if (ssoAttemptRef.current === ssoExchangeToken) return;
    ssoAttemptRef.current = ssoExchangeToken;

    let cancelled = false;

    const completeSsoLogin = async () => {
      setIsCompletingSso(true);
      try {
        const coords = coordinatesRef.current ?? (await acquireLocation());
        if (!coords) {
          throw new Error("Allow location access to complete Okta sign-in.");
        }

        const session = await loginWithSsoExchangeToken(
          ssoExchangeToken,
          coords,
        );
        if (cancelled) return;

        toast.success(`Welcome back, ${session.name}.`);
        navigate(resolvePostLoginHref(session.role), { replace: true });
      } catch (err: unknown) {
        if (cancelled) return;
        ssoAttemptRef.current = null;
        const message =
          err instanceof Error
            ? err.message
            : "Okta sign-in failed. Try again.";
        toast.error(message);
        navigate(PAGES.LOGIN, { replace: true });
      } finally {
        if (!cancelled) setIsCompletingSso(false);
      }
    };

    void completeSsoLogin();

    return () => {
      cancelled = true;
    };
  }, [
    accessGate,
    ssoExchangeToken,
    acquireLocation,
    coordinatesRef,
    navigate,
  ]);

  const handleRetryAccessCheck = async () => {
    setIsRecheckingAccess(true);
    setAccessGate("checking");
    await runAccessCheck();
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
      const session: LoginResponse = await loginWithEmailPassword(
        trimmedEmail,
        password,
        coords,
      );
      toast.success(`Welcome back, ${session.name}.`);
      navigate(resolvePostLoginHref(session.role));
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
    if (accessGate !== "allowed") return;
    const url = String(import.meta.env["VITE_API_BASE_URL"]).concat("/sso");
    return (window.location.href = url);
  };

  if (accessGate === "checking") {
    return (
      <AuthLayout title="Login">
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p className="text-sm">Verifying network access…</p>
        </div>
      </AuthLayout>
    );
  }

  if (accessGate === "blocked") {
    return (
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
    );
  }

  if (isCompletingSso && ssoExchangeToken) {
    return (
      <AuthLayout title="Login">
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p className="text-sm">Completing Okta sign-in…</p>
        </div>
      </AuthLayout>
    );
  }

  if (accessGate === "error") {
    return (
      <AuthLayout title="Login">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <img src="/logo.svg" alt="Whirlpool" />
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
    );
  }

  if (ssoExchangeToken) {
    return (
      <AuthLayout title="Login">
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p className="text-sm">Preparing Okta sign-in…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Login">
      <div className={cardLockClass}>
        <Card className="mx-auto w-full max-w-96 sm:w-96">
          <CardHeader>
            <img src="/logo.svg" alt="Whirlpool" />
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
                  disabled={!isLocationReady}
                  onClick={redirectOktaSSO}
                >
                  Okta SSO Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
