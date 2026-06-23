import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { LoginResponse } from "@/api/generated/model/loginResponse";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeviceSelectionDialog } from "@/components/auth/device-selection-dialog";
import { BrandLogo } from "@/components/brand-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGES } from "@/endpoints";
import { useSessionUser } from "@/hooks/use-session-user";
import AuthLayout from "@/pages/auth/layout";
import {
  clearPendingLoginState,
  readPendingLoginState,
} from "@/lib/pending-login-state";
import {
  markPasswordChangeComplete,
  requiresPasswordChange,
} from "@/lib/session-password-flags";
import {
  navigateAfterAuthenticatedLogin,
  shouldShowDeviceSelection,
} from "@/services/login-service";

const ACCESS_TOKEN_KEY = "whirlpool.access_token";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const sessionUser = useSessionUser();
  const forced = requiresPasswordChange();
  const [pendingLogin, setPendingLogin] = useState<LoginResponse | null>(() =>
    readPendingLoginState(),
  );
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);

  const hasToken =
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY)?.trim());

  const finishPostPasswordNavigation = useCallback(
    (login: LoginResponse | null) => {
      const role = login?.role ?? sessionUser?.role ?? "";
      if (login && shouldShowDeviceSelection(login)) {
        setPendingLogin(login);
        setDeviceDialogOpen(true);
        return;
      }
      toast.success("Password updated successfully.");
      navigateAfterAuthenticatedLogin(navigate, role);
    },
    [navigate, sessionUser?.role],
  );

  const handleSuccess = useCallback(() => {
    markPasswordChangeComplete();
    const pending = readPendingLoginState();
    clearPendingLoginState();
    if (pending) {
      finishPostPasswordNavigation(pending);
      return;
    }
    if (forced) {
      finishPostPasswordNavigation(null);
      return;
    }
    toast.success("Password updated successfully.");
    navigate(-1);
  }, [finishPostPasswordNavigation, forced, navigate]);

  const handleDeviceSelectionResolved = useCallback(() => {
    const login = pendingLogin;
    setPendingLogin(null);
    setDeviceDialogOpen(false);
    clearPendingLoginState();
    toast.success("Password updated successfully.");
    if (login) {
      navigateAfterAuthenticatedLogin(navigate, login.role);
    }
  }, [navigate, pendingLogin]);

  const handleDeviceSelectionCancel = useCallback(() => {
    setDeviceDialogOpen(false);
    toast.info("Choose a device to continue.");
    setDeviceDialogOpen(true);
  }, []);

  if (!hasToken) {
    return <Navigate to={PAGES.LOGIN} replace />;
  }

  const userInputs = sessionUser
    ? [sessionUser.email, sessionUser.name].filter(Boolean)
    : [];

  return (
    <>
      <DeviceSelectionDialog
        open={deviceDialogOpen}
        login={pendingLogin}
        onResolved={handleDeviceSelectionResolved}
        onCancel={handleDeviceSelectionCancel}
      />
      <AuthLayout title={forced ? "Set new password" : "Change password"}>
        <Card className="mx-auto w-full max-w-lg sm:w-full">
          <CardHeader>
            <BrandLogo />
            <CardTitle className="text-2xl">
              {forced ? "Set a new password" : "Change password"}
            </CardTitle>
            <CardDescription>
              {forced
                ? "Your temporary or expired password must be replaced before you can continue."
                : "Choose a strong, unique password to keep your account secure."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sessionUser ? (
              <div className="text-muted-foreground flex min-h-24 items-center justify-center gap-2 text-sm">
                <Loader2 className="size-5 animate-spin" />
                Loading account…
              </div>
            ) : (
              <ChangePasswordForm
                mode={forced ? "forced" : "voluntary"}
                userInputs={userInputs}
                onSuccess={handleSuccess}
              />
            )}
          </CardContent>
        </Card>
      </AuthLayout>
    </>
  );
}
