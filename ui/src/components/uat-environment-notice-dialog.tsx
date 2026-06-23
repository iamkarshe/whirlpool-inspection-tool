import { ExternalLink, FlaskConical } from "lucide-react";

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
  getConfiguredProdAppUrl,
  isNonProductionAppHost,
} from "@/lib/app-environment";

export type UatEnvironmentNoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UatEnvironmentNoticeDialog({
  open,
  onOpenChange,
}: UatEnvironmentNoticeDialogProps) {
  if (!isNonProductionAppHost()) return null;

  const prodUrl = getConfiguredProdAppUrl();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-violet-400/60 bg-violet-500/10">
            <FlaskConical
              className="h-6 w-6 text-violet-700 dark:text-violet-200"
              aria-hidden
            />
          </div>
          <DialogTitle>UAT application</DialogTitle>
          <DialogDescription className="text-center">
            You are signed in to a UAT or non-production environment, not the
            live production application. Data and behavior here may differ from
            production.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {prodUrl ? (
            <Button variant="outline" className="w-full" asChild>
              <a href={prodUrl} target="_blank" rel="noopener noreferrer">
                Open production
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </Button>
          ) : null}
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Continue to UAT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
