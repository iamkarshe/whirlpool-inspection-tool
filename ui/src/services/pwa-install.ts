const INSTALL_ACCEPTED_KEY = "whirlpool.pwaInstall.accepted";
const INSTALL_DISMISSED_KEY = "whirlpool.pwaInstall.dismissed";
const INSTALL_STATE_CHANGED_EVENT = "whirlpool-pwa-install-state-changed";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaInstallOutcome = "accepted" | "dismissed" | "installed" | "unavailable";

let installPrompt: BeforeInstallPromptEvent | null = null;
let listenersAttached = false;

function emitInstallStateChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INSTALL_STATE_CHANGED_EVENT));
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isMobileInstallTarget(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 767px)").matches ||
    /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
  );
}

export function hasPwaInstallPromptBeenDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.localStorage.getItem(INSTALL_ACCEPTED_KEY) === "true" ||
    window.sessionStorage.getItem(INSTALL_DISMISSED_KEY) === "true"
  );
}

export function markPwaInstallPromptDismissed(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, "true");
}

export function getPwaInstallPrompt(): BeforeInstallPromptEvent | null {
  return installPrompt;
}

export function isPwaInstallPromptAvailable(): boolean {
  return installPrompt !== null && !isStandaloneDisplay();
}

export async function installPwaApp(): Promise<PwaInstallOutcome> {
  if (isStandaloneDisplay()) return "installed";
  if (!installPrompt) return "unavailable";

  const prompt = installPrompt;
  installPrompt = null;
  emitInstallStateChanged();

  await prompt.prompt();
  const choice = await prompt.userChoice;

  if (choice.outcome === "accepted") {
    window.localStorage.setItem(INSTALL_ACCEPTED_KEY, "true");
  }

  return choice.outcome;
}

export function subscribePwaInstallState(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(INSTALL_STATE_CHANGED_EVENT, listener);
  return () => window.removeEventListener(INSTALL_STATE_CHANGED_EVENT, listener);
}

export function initPwaInstallPromptCapture(): void {
  if (typeof window === "undefined" || listenersAttached) return;
  listenersAttached = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    if (isStandaloneDisplay()) return;

    event.preventDefault();
    installPrompt = event as BeforeInstallPromptEvent;
    emitInstallStateChanged();
  });

  window.addEventListener("appinstalled", () => {
    window.localStorage.setItem(INSTALL_ACCEPTED_KEY, "true");
    installPrompt = null;
    emitInstallStateChanged();
  });
}
