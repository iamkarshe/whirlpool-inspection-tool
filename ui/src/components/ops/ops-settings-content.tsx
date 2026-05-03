import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/hooks/use-theme";
import { MoonIcon, SunIcon } from "lucide-react";
import { useState } from "react";

/** Appearance controls for the Ops app (merged into Account). */
export function OpsSettingsContent() {
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <>
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

      <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose theme</DialogTitle>
            <DialogDescription>
              Pick how this app should look on this device.
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
    </>
  );
}
