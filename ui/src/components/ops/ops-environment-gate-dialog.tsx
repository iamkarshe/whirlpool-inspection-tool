import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getOpsHealthCheckUrl } from "@/hooks/use-ops-environment-gate";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  Loader2,
  MapPin,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

function StatusRow({
  ok,
  pending,
  bad,
  icon: Icon,
  title,
  detail,
}: {
  ok: boolean;
  pending?: boolean;
  bad: boolean;
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  const showPending = Boolean(pending);
  return (
    <div className="flex gap-3 rounded-2xl border bg-muted/25 px-3 py-2.5 text-left">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-background/80">
        <Icon
          className={cn(
            "h-4 w-4",
            showPending && "text-muted-foreground",
            ok && "text-emerald-600 dark:text-emerald-400",
            bad && !showPending && "text-destructive",
          )}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center self-center">
        {showPending ?
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        : ok ?
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        : <XCircle className="h-5 w-5 text-destructive" />}
      </div>
    </div>
  );
}

type OpsEnvironmentGateDialogProps = {
  open: boolean;
  online: boolean;
  apiBaseConfigured: boolean;
  healthOk: boolean | null;
  healthChecking: boolean;
  locationUnsupported: boolean;
  isLocationReady: boolean;
  locationError: string | undefined;
  onRecheck: () => Promise<void>;
  onRequestLocation: () => Promise<unknown>;
};

export function OpsEnvironmentGateDialog({
  open,
  online,
  apiBaseConfigured,
  healthOk,
  healthChecking,
  locationUnsupported,
  isLocationReady,
  locationError,
  onRecheck,
  onRequestLocation,
}: OpsEnvironmentGateDialogProps) {
  const [locationBusy, setLocationBusy] = useState(false);
  const [recheckBusy, setRecheckBusy] = useState(false);

  const healthPending = healthOk === null || healthChecking;
  const healthRowOk = healthOk === true;
  const healthRowBad = !healthPending && healthOk !== true;

  const healthUrl = getOpsHealthCheckUrl();
  const healthDetail = !apiBaseConfigured ?
    "VITE_API_BASE_URL is not set. Configure the API base URL to enable health checks."
  : healthPending ?
    "Calling GET /health on your API server…"
  : healthRowOk ?
    `Server responded OK${healthUrl ? ` (${healthUrl})` : ""}.`
  : `Server did not return success on GET /health${healthUrl ? ` (${healthUrl})` : ""}. Check VPN, DNS, or server status.`;

  const locationRowOk = isLocationReady;
  const locationPending =
    !locationUnsupported && !isLocationReady && !locationError;
  const locationBad = !locationRowOk && !locationPending;

  const locationDetail = locationUnsupported ?
    "This browser does not support geolocation. Use a supported mobile browser."
  : isLocationReady ?
    "A current position fix is available for warehouse operations."
  : locationError ?
    locationError
  : "Tap Share location and allow access when the browser prompts you.";

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[100]"
        className="z-[101] max-h-[90vh] max-w-md overflow-y-auto rounded-2xl sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Checking your environment</DialogTitle>
          <DialogDescription>
            Ops needs internet, a reachable API, and your location before you
            can continue. This dialog stays open until everything passes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <StatusRow
            icon={online ? Wifi : WifiOff}
            ok={online}
            bad={!online}
            title="Internet connection"
            detail={
              online ?
                "You appear to be online."
              : "You are offline. Connect to Wi‑Fi or mobile data."
            }
          />
          <StatusRow
            icon={Activity}
            ok={healthRowOk}
            pending={healthPending}
            bad={healthRowBad}
            title="API reachability (/health)"
            detail={healthDetail}
          />
          <StatusRow
            icon={MapPin}
            ok={locationRowOk}
            pending={locationPending}
            bad={locationBad && !locationRowOk}
            title="Geolocation"
            detail={locationDetail}
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            variant="default"
            className="w-full"
            disabled={
              !online || healthOk !== true || locationUnsupported || locationBusy
            }
            onClick={async () => {
              setLocationBusy(true);
              try {
                await onRequestLocation();
              } finally {
                setLocationBusy(false);
              }
            }}
          >
            {locationBusy ?
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Requesting location…
              </span>
            : isLocationReady ?
              "Location OK"
            : "Share location"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={recheckBusy}
            onClick={async () => {
              setRecheckBusy(true);
              try {
                await onRecheck();
              } finally {
                setRecheckBusy(false);
              }
            }}
          >
            {recheckBusy ?
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Rechecking…
              </span>
            : "Recheck connection & API"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
