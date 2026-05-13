import { BellRing, CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCurrentPushNotificationSetupStatus,
  subscribeCurrentDeviceToPush,
  type PushNotificationSetupStatus,
} from "@/services/push-notifications";

function SetupCheckItem({
  complete,
  label,
  detail,
}: {
  complete: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border bg-background/70 p-3">
      {complete ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
      ) : (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
          {detail}
        </p>
      </div>
    </div>
  );
}

export function PushNotificationSetupAccordion() {
  const [status, setStatus] = useState<PushNotificationSetupStatus | null>(
    null,
  );
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [permissionPromptOpen, setPermissionPromptOpen] = useState(false);

  const refreshStatus = async () => {
    setLoadingStatus(true);
    try {
      setStatus(await getCurrentPushNotificationSetupStatus());
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  const handleEnableClick = () => {
    setPermissionPromptOpen(true);
  };

  const handleConfirmEnable = async () => {
    if (status?.permission === "denied") {
      await refreshStatus();
      return;
    }

    setEnabling(true);
    try {
      await subscribeCurrentDeviceToPush();
      toast.success("Notifications enabled for this device.");
      setPermissionPromptOpen(false);
      await refreshStatus();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to enable notifications.",
      );
      await refreshStatus();
    } finally {
      setEnabling(false);
    }
  };

  const permission = status?.permission ?? "default";
  const setupComplete = Boolean(status?.enabled);
  const missingCount = [
    Boolean(status?.supported),
    permission === "granted",
    Boolean(status?.subscribed),
  ].filter((complete) => !complete).length;
  const ctaDisabled = enabling || loadingStatus || status?.supported === false;

  if (loadingStatus && !status) return null;
  if (setupComplete) return null;

  return (
    <>
      <section className="rounded-3xl border bg-card/80 shadow-sm">
        <Accordion type="single" collapsible>
          <AccordionItem value="push-setup" className="border-none">
            <AccordionTrigger className="px-4 py-4 hover:no-underline">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <BellRing className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Setup Checklist</p>
                    <p className="text-xs text-muted-foreground">
                      Enable alerts to receive inspection updates.
                    </p>
                  </div>
                </div>
                <Badge variant="warning" className="shrink-0">
                  <CircleAlert className="h-3 w-3" />
                  {missingCount} missing
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                <div className="grid gap-2">
                  <SetupCheckItem
                    complete={Boolean(status?.supported)}
                    label="Browser supports push"
                    detail={
                      loadingStatus
                        ? "Checking this browser..."
                        : status?.supported
                          ? "This browser can receive Web Push notifications."
                          : "This browser does not support PWA push notifications."
                    }
                  />
                  <SetupCheckItem
                    complete={permission === "granted"}
                    label="Notification permission"
                    detail={
                      permission === "granted"
                        ? "Permission is allowed."
                        : permission === "denied"
                          ? "Permission is blocked. Enable it from browser site settings."
                          : "Permission is pending. Tap enable to allow notifications."
                    }
                  />
                  <SetupCheckItem
                    complete={Boolean(status?.subscribed)}
                    label="Device registered with API"
                    detail={
                      status?.subscribed
                        ? "This device has an active push subscription."
                        : "Register this device so the backend can send updates."
                    }
                  />
                </div>

                {!setupComplete ? (
                  <Button
                    type="button"
                    className="w-full rounded-2xl"
                    variant={
                      status?.permission === "denied" ? "outline" : "default"
                    }
                    disabled={ctaDisabled}
                    onClick={handleEnableClick}
                  >
                    {enabling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BellRing className="h-4 w-4" />
                    )}
                    {status?.permission === "denied"
                      ? "Setup notifications"
                      : "Enable notifications"}
                  </Button>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Dialog
        open={permissionPromptOpen}
        onOpenChange={setPermissionPromptOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {status?.permission === "denied"
                ? "Notifications are blocked"
                : "Allow inspection notifications?"}
            </DialogTitle>
            <DialogDescription>
              {status?.permission === "denied"
                ? "Your browser has blocked notification permission for this app. Browsers do not allow the app to reopen the native permission prompt after it has been blocked."
                : "We will ask your browser for permission to send inspection assignments and important app updates to this device."}
            </DialogDescription>
          </DialogHeader>

          {status?.permission === "denied" ? (
            <ol className="space-y-2 rounded-2xl border bg-muted/30 p-4 text-sm">
              {[
                "Open browser site settings for this app.",
                "Set Notifications to Allow.",
                "Return here and tap refresh.",
              ].map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPermissionPromptOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={enabling}
              onClick={
                status?.permission === "denied"
                  ? refreshStatus
                  : handleConfirmEnable
              }
            >
              {enabling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {status?.permission === "denied" ? "Refresh" : "Allow now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
