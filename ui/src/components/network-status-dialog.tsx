import { Loader2, RefreshCw, WifiOff } from "lucide-react";
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
import {
  networkStatusMessage,
  type NetworkStatusKind,
} from "@/hooks/use-network-status";

export type NetworkStatusDialogProps = {
  kind: Extract<NetworkStatusKind, "offline" | "api_unreachable"> | null;
  healthChecking?: boolean;
  onRecheck: () => Promise<void>;
};

export function NetworkStatusDialog({
  kind,
  healthChecking = false,
  onRecheck,
}: NetworkStatusDialogProps) {
  const [retryBusy, setRetryBusy] = useState(false);
  const open = kind !== null;
  const busy = retryBusy || healthChecking;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[100]"
        className="z-[101] sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
            <WifiOff className="h-6 w-6 text-destructive" aria-hidden />
          </div>
          <DialogTitle>
            {kind === "offline" ? "You're offline" : "Can't reach the server"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {kind ? networkStatusMessage(kind) : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={async () => {
              setRetryBusy(true);
              try {
                await onRecheck();
              } finally {
                setRetryBusy(false);
              }
            }}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Checking connection…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden />
                Retry
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
