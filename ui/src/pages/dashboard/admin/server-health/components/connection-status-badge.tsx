import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ServerHealthStreamStatus } from "@/hooks/use-server-health-stream";
import { cn } from "@/lib/utils";

export type ConnectionStatusBadgeProps = {
  status: ServerHealthStreamStatus;
  closeReason: string | null;
  onReconnect?: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
};

function statusLabel(status: ServerHealthStreamStatus): string {
  switch (status) {
    case "live":
      return "Live";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "unauthorized":
      return "Unauthorized";
    case "forbidden":
      return "Forbidden";
    case "closed":
      return "Disconnected";
    default:
      return "Idle";
  }
}

function statusDotClass(status: ServerHealthStreamStatus): string {
  switch (status) {
    case "live":
      return "bg-emerald-500";
    case "connecting":
    case "reconnecting":
      return "bg-amber-500 animate-pulse";
    case "unauthorized":
    case "forbidden":
      return "bg-destructive";
    default:
      return "bg-muted-foreground";
  }
}

export function ConnectionStatusBadge({
  status,
  closeReason,
  onReconnect,
  isRefreshing = false,
  onRefresh,
}: ConnectionStatusBadgeProps) {
  const showReconnect =
    status === "reconnecting" ||
    status === "closed" ||
    status === "unauthorized" ||
    status === "forbidden";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
          status === "live"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-border bg-muted/40 text-muted-foreground",
        )}
      >
        <span
          className={cn("h-2 w-2 rounded-full", statusDotClass(status))}
          aria-hidden
        />
        {statusLabel(status)}
        {status === "live" ? (
          <Wifi className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
        )}
      </span>

      {onRefresh ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          {isRefreshing ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Refresh
        </Button>
      ) : null}

      {showReconnect && onReconnect ? (
        <Button type="button" variant="outline" size="sm" onClick={onReconnect}>
          Reconnect
        </Button>
      ) : null}

      {closeReason && status !== "live" ? (
        <span className="text-muted-foreground text-xs">{closeReason}</span>
      ) : null}
    </div>
  );
}
