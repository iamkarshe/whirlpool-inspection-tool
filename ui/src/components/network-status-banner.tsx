import { AlertTriangle, RefreshCw, WifiOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  networkBannerMessage,
  type NetworkBannerKind,
} from "@/hooks/use-network-status";
import { cn } from "@/lib/utils";

export type NetworkStatusBannerProps = {
  kind: NetworkBannerKind;
  lastRttMs?: number | null;
  healthChecking?: boolean;
  onDismiss?: () => void;
  onRecheck?: () => void;
  className?: string;
};

export function NetworkStatusBanner({
  kind,
  lastRttMs,
  healthChecking = false,
  onDismiss,
  onRecheck,
  className,
}: NetworkStatusBannerProps) {
  if (!kind) return null;

  const dismissible = kind === "slow";
  const message = networkBannerMessage(kind, { lastRttMs });

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b px-4 py-2.5 text-sm",
        kind === "offline" && "border-destructive/30 bg-destructive/10 text-destructive",
        kind === "api_unreachable" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        kind === "slow" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {kind === "slow" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <p className="leading-snug">{message}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onRecheck ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={healthChecking}
              onClick={onRecheck}
            >
              <RefreshCw
                className={cn("mr-1 h-4 w-4", healthChecking && "animate-spin")}
              />
              Retry
            </Button>
          ) : null}
          {dismissible && onDismiss ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Dismiss slow network warning"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
