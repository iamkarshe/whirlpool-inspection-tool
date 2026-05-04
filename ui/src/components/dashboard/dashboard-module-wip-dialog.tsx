import { Construction } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "dashboard-module-wip:";

export type DashboardModuleWipDialogProps = {
  /** Short id for session dismissal, e.g. `dashboard-home`. */
  storageKey: string;
  /** Human-readable module name (shown in copy). */
  moduleName: string;
  /** Optional extra sentence appended to the default message. */
  extraMessage?: string;
  className?: string;
};

/**
 * Session-scoped “work in progress” notice for dashboard modules still under development.
 * Dismissal is remembered until the browser tab is closed.
 */
export function DashboardModuleWipDialog({
  storageKey,
  moduleName,
  extraMessage,
  className,
}: DashboardModuleWipDialogProps) {
  const dismissedKey = `${STORAGE_PREFIX}${storageKey}`;

  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(dismissedKey) !== "1";
    } catch {
      return true;
    }
  });

  const persistDismissed = useCallback(() => {
    try {
      window.sessionStorage.setItem(dismissedKey, "1");
    } catch {
      /* private mode / quota */
    }
  }, [dismissedKey]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) persistDismissed();
      setOpen(next);
    },
    [persistDismissed],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(className)} showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <Construction
              className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            Work in progress
          </DialogTitle>
          <DialogDescription className="text-left">
            {moduleName} is still under development. You may see placeholder content,
            changing metrics, or incomplete exports. Thank you for your patience.
            {extraMessage ? ` ${extraMessage}` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
