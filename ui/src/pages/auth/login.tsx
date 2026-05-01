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
import { useGeolocation } from "@/hooks/use-geolocation";
import { PAGES } from "@/endpoints";
import AuthLayout from "@/pages/auth/layout";
import {
  LOGIN_PASSWORD_MAX_LENGTH,
  LOGIN_PASSWORD_MIN_LENGTH,
  loginWithEmailPassword,
  resolvePostLoginHref,
} from "@/services/login-service";
import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isLocationReady, coordinatesRef, acquireLocation } = useGeolocation();

  const [email, setEmail] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_EMAIL : "",
  );
  const [password, setPassword] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_PASSWORD : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void acquireLocation();
  }, [acquireLocation]);

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

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
      const session = await loginWithEmailPassword(
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
                  <Link
                    to={PAGES.FORGOT_PASSWORD}
                    className="ml-auto inline-block text-sm underline"
                  >
                    Forgot your password?
                  </Link>
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
