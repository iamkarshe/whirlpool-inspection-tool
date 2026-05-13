import { BellRing } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  isPushNotificationSupported,
  subscribeCurrentDeviceToPush,
} from "@/services/push-notifications";

const NOTIFICATION_TOAST_ID = "whirlpool-pwa-notifications";
const NOTIFICATION_DISMISSED_KEY = "whirlpool.pwaNotifications.dismissed";
const NOTIFICATION_ENABLED_KEY = "whirlpool.pwaNotifications.enabled";

function hasNotificationPromptBeenDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.localStorage.getItem(NOTIFICATION_ENABLED_KEY) === "true" ||
    window.sessionStorage.getItem(NOTIFICATION_DISMISSED_KEY) === "true"
  );
}

export function PwaNotificationPrompt() {
  const isMobile = useIsMobile();
  const sessionUser = useSessionUser();

  useEffect(() => {
    if (
      !sessionUser ||
      !isMobile ||
      hasNotificationPromptBeenDismissed() ||
      !isPushNotificationSupported() ||
      Notification.permission !== "default"
    ) {
      return;
    }

    toast.custom(
      (toastId) => (
        <div className="relative w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 text-slate-950 shadow-2xl shadow-indigo-950/15 dark:border-indigo-400/25 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950 dark:text-slate-50">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-indigo-400/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-sky-400/20 blur-2xl" />

          <div className="relative flex gap-3 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
              <BellRing className="h-6 w-6" strokeWidth={2.4} />
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <div>
                  <p className="text-[15px] font-bold leading-tight">
                    Enable inspection notifications
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    Get assigned inspections and important updates on this
                    phone.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-slate-950/20 transition-transform active:scale-[0.98] dark:bg-white dark:text-slate-950"
                  onClick={async () => {
                    toast.dismiss(toastId);
                    try {
                      await subscribeCurrentDeviceToPush();
                      window.localStorage.setItem(
                        NOTIFICATION_ENABLED_KEY,
                        "true",
                      );
                      toast.success("Notifications enabled for this device.");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Unable to enable notifications.",
                      );
                    }
                  }}
                >
                  <BellRing className="h-4 w-4" />
                  Enable
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  onClick={() => {
                    window.sessionStorage.setItem(
                      NOTIFICATION_DISMISSED_KEY,
                      "true",
                    );
                    toast.dismiss(toastId);
                  }}
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        id: NOTIFICATION_TOAST_ID,
        duration: Infinity,
      },
    );
  }, [isMobile, sessionUser]);

  return null;
}
