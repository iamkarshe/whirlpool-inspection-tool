import { DownloadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";

const INSTALL_TOAST_ID = "whirlpool-pwa-install";
const INSTALL_DISMISSED_KEY = "whirlpool.pwaInstall.dismissed";
const INSTALL_ACCEPTED_KEY = "whirlpool.pwaInstall.accepted";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isMobileInstallTarget(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 767px)").matches ||
    /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
  );
}

function hasInstallPromptBeenDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.localStorage.getItem(INSTALL_ACCEPTED_KEY) === "true" ||
    window.sessionStorage.getItem(INSTALL_DISMISSED_KEY) === "true"
  );
}

export function PwaInstallPrompt() {
  const isMobile = useIsMobile();
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      if (
        !isMobileInstallTarget() ||
        isStandaloneDisplay() ||
        hasInstallPromptBeenDismissed()
      ) {
        return;
      }

      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      window.localStorage.setItem(INSTALL_ACCEPTED_KEY, "true");
      toast.dismiss(INSTALL_TOAST_ID);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (
      !isMobile ||
      !installPrompt ||
      isStandaloneDisplay() ||
      hasInstallPromptBeenDismissed()
    ) {
      return;
    }

    toast.custom(
      (toastId) => (
        <div className="relative w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-0 text-slate-950 shadow-2xl shadow-sky-950/15 dark:border-sky-400/25 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 dark:text-slate-50">
          <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-sky-400/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />

          <div className="relative flex gap-3 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-lg shadow-sky-500/25">
              <DownloadCloud className="h-6 w-6" strokeWidth={2.4} />
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <div>
                  <p className="text-[15px] font-bold leading-tight">
                    Install Whirlpool Insights
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    Add it to your phone for quicker inspections, faster launch,
                    and a native app feel.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-slate-950/20 transition-transform active:scale-[0.98] dark:bg-white dark:text-slate-950"
                  onClick={async () => {
                    toast.dismiss(toastId);
                    await installPrompt.prompt();
                    const choice = await installPrompt.userChoice;
                    setInstallPrompt(null);

                    if (choice.outcome === "accepted") {
                      window.localStorage.setItem(INSTALL_ACCEPTED_KEY, "true");
                      toast.success("App install started.");
                    } else {
                      toast.info("Install skipped for now.");
                    }
                  }}
                >
                  <DownloadCloud className="h-4 w-4" />
                  Install app
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  onClick={() => {
                    window.sessionStorage.setItem(
                      INSTALL_DISMISSED_KEY,
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
        id: INSTALL_TOAST_ID,
        duration: Infinity,
      },
    );
  }, [installPrompt, isMobile]);

  return null;
}
