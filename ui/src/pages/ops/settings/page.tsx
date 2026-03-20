import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoonIcon, Smartphone, SunIcon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";

type ConfirmAction = "offline" | "deactivate" | null;

export default function OpsSettingsPage() {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleConfirm = () => {
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-1 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Device status</p>
            <p className="text-xs text-muted-foreground">
              Control how this handheld appears to your warehouse.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmAction("offline")}
          className="flex w-full items-center justify-between rounded-2xl bg-muted/40 px-3 py-3 text-left transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium">Mark device offline / outside</p>
              <p className="text-xs text-muted-foreground">
                Use when taking the device outside the warehouse floor.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setConfirmAction("deactivate")}
          className="mt-2 flex w-full items-center justify-between rounded-2xl bg-destructive/5 px-3 py-3 text-left text-destructive transition-colors hover:bg-destructive/10"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium">Deactivate device</p>
              <p className="text-xs text-destructive/80">
                Stop using this device until IT re-enables it.
              </p>
            </div>
          </div>
        </button>
      </section>

      <section className="space-y-1 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MoonIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Appearance</p>
            <p className="text-xs text-muted-foreground">
              Switch between light and dark to match your environment.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setThemeDialogOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-muted/40 px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
        >
          <span>{isDark ? "Use light theme" : "Use dark theme"}</span>
        </button>
      </section>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "deactivate"
                ? "Deactivate this device?"
                : confirmAction === "offline"
                  ? "Mark device offline / outside?"
                  : ""}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "deactivate"
                ? "This device will stop being used for inspections until an administrator re-activates it."
                : confirmAction === "offline"
                  ? "Use this when taking the device outside the warehouse floor so supervisors know it is temporarily offline."
                  : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button type="button" variant={confirmAction === "deactivate" ? "destructive" : "default"} onClick={handleConfirm}>
              {confirmAction === "deactivate"
                ? "Yes, deactivate"
                : "Yes, mark offline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose theme</DialogTitle>
            <DialogDescription>
              Pick how the Ops app should look on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                setTheme("light");
                setThemeDialogOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl border bg-card px-3 py-3 text-left text-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-700 dark:text-yellow-300">
                  <SunIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">Use light theme</p>
                  <p className="text-xs text-muted-foreground">
                    Brighter interface, ideal for well-lit warehouse floors.
                  </p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme("dark");
                setThemeDialogOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl border bg-card px-3 py-3 text-left text-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-slate-100">
                  <MoonIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">Use dark theme</p>
                  <p className="text-xs text-muted-foreground">
                    Dimmed background that&apos;s easier on eyes at night.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


