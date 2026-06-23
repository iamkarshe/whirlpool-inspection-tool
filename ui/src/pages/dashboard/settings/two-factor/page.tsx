import { Loader2, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { TwoFactorSetupStartResponse } from "@/api/generated/model/twoFactorSetupStartResponse";
import type { TwoFactorStatusResponse } from "@/api/generated/model/twoFactorStatusResponse";
import { TwoFactorSetupPanel } from "@/components/auth/two-factor-setup-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DialogDisableTwoFactor } from "@/pages/dashboard/settings/dialog-disable-two-factor";
import { DialogResetTwoFactorSelf } from "@/pages/dashboard/settings/dialog-reset-two-factor-self";
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  fetchTwoFactorStatus,
  resetOwnTwoFactor,
  startTwoFactorSetup,
} from "@/services/two-factor-api";

export default function SettingsTwoFactorPage() {
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetupStartResponse | null>(null);
  const [isStartingSetup, setIsStartingSetup] = useState(false);
  const [isConfirmingSetup, setIsConfirmingSetup] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchTwoFactorStatus();
      setStatus(next);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not load 2FA status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadStatus());
  }, [loadStatus]);

  const handleStartSetup = async () => {
    setIsStartingSetup(true);
    try {
      const response = await startTwoFactorSetup();
      setSetup(response);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not start 2FA setup.",
      );
    } finally {
      setIsStartingSetup(false);
    }
  };

  const handleConfirmSetup = async (totpCode: string) => {
    setIsConfirmingSetup(true);
    try {
      await confirmTwoFactorSetup(totpCode);
      toast.success("Two-factor authentication enabled.");
      setSetup(null);
      await loadStatus();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not confirm 2FA setup.",
      );
    } finally {
      setIsConfirmingSetup(false);
    }
  };

  const handleDisable = async (totpCode: string) => {
    setActionLoading(true);
    try {
      await disableTwoFactor(totpCode);
      toast.success("Two-factor authentication disabled.");
      await loadStatus();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not disable 2FA.",
      );
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async (currentPassword: string) => {
    setActionLoading(true);
    try {
      const result = await resetOwnTwoFactor(currentPassword);
      toast.success(result.message || "Two-factor authentication reset.");
      setSetup(null);
      await loadStatus();
      if (result.two_factor_enforced) {
        toast.info("2FA is still required. Set up a new authenticator now.");
        await handleStartSetup();
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not reset 2FA.",
      );
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const enabled = status?.two_factor_enabled === true;
  const enforced = status?.two_factor_enforced === true;
  const setupRequired = status?.two_factor_setup_required === true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Protect your account with a time-based code from an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading security status…
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load 2FA status</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={enabled ? "success" : "secondary"}
                  className="gap-1.5"
                >
                  {enabled ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <Shield className="h-3.5 w-3.5" />
                  )}
                  {enabled ? "2FA enabled" : "2FA not enabled"}
                </Badge>
                {enforced ? (
                  <Badge variant="warning" className="gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Required by admin
                  </Badge>
                ) : null}
              </div>

              {(setupRequired || (enforced && !enabled)) && !setup ? (
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Two-factor authentication required</AlertTitle>
                  <AlertDescription>
                    Your administrator requires 2FA. Set up an authenticator app
                    now to keep access to your account.
                  </AlertDescription>
                </Alert>
              ) : null}

              {!setup ? (
                <div className="flex flex-wrap gap-2">
                  {!enabled ? (
                    <Button
                      type="button"
                      onClick={() => void handleStartSetup()}
                      disabled={isStartingSetup}
                    >
                      {isStartingSetup ? (
                        <>
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          Starting…
                        </>
                      ) : (
                        "Enable 2FA"
                      )}
                    </Button>
                  ) : null}

                  {enabled && !enforced ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDisableOpen(true)}
                    >
                      Disable 2FA
                    </Button>
                  ) : null}

                  {enabled ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetOpen(true)}
                    >
                      Reset 2FA
                    </Button>
                  ) : null}
                </div>
              ) : (
                <TwoFactorSetupPanel
                  setup={setup}
                  isSubmitting={isConfirmingSetup}
                  submitLabel="Confirm and enable"
                  onSubmit={handleConfirmSetup}
                />
              )}

              {!enabled && !setup ? (
                <p className="text-muted-foreground text-sm">
                  Lost your authenticator without an active session? Contact a
                  superadmin to reset your 2FA from the admin console.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <DialogDisableTwoFactor
        open={disableOpen}
        onOpenChange={setDisableOpen}
        isLoading={actionLoading}
        onConfirm={handleDisable}
      />
      <DialogResetTwoFactorSelf
        open={resetOpen}
        onOpenChange={setResetOpen}
        isLoading={actionLoading}
        onConfirm={handleReset}
      />
    </div>
  );
}
