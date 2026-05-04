import { Construction } from "lucide-react";
import { useState } from "react";

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

export type DashboardModuleWipDialogProps = {
  /** Human-readable module name (shown in copy). */
  moduleName: string;
  /** Optional extra sentence appended to the default message. */
  extraMessage?: string;
  className?: string;
};

/**
 * “Work in progress” notice for dashboard modules still under development.
 * Opens whenever the host screen mounts; closing only hides it until the user
 * leaves and returns (no sessionStorage).
 */
export function DashboardModuleWipDialog({
  moduleName,
  extraMessage,
  className,
}: DashboardModuleWipDialogProps) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <Button type="button" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
