import { AlertTriangle, RefreshCw, X } from "lucide-react";

import { useNetworkStatusContext } from "@/components/network-status-provider";
import { StatusBadgeDialog } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { networkStatusMessage } from "@/hooks/use-network-status";
import { cn } from "@/lib/utils";

export type SlowNetworkBadgeProps = {
  className?: string;
};

export function SlowNetworkBadge({ className }: SlowNetworkBadgeProps) {
  const {
    slowNetwork,
    slowBannerDismissed,
    lastRttMs,
    healthChecking,
    dismissSlowBanner,
    recheck,
  } = useNetworkStatusContext();

  if (!slowNetwork || slowBannerDismissed) return null;

  const description = networkStatusMessage("slow", { lastRttMs });

  return (
    <StatusBadgeDialog
      tone="amber"
      icon={AlertTriangle}
      label="SLOW"
      title="Slow network detected"
      description={description}
      descriptionText={description}
      className={className}
      aria-label="Slow network details"
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 flex-1 text-xs"
            disabled={healthChecking}
            onClick={() => void recheck()}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", healthChecking && "animate-spin")}
              aria-hidden
            />
            Retry
          </Button>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={dismissSlowBanner}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Dismiss
            </Button>
          </DialogClose>
        </>
      }
    />
  );
}
