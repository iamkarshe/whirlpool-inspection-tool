import { Loader2, LogOut, MonitorSmartphone, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { ActiveDeviceResponse } from "@/api/generated/model/activeDeviceResponse";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deregisterAuthDevice,
  fetchActiveAuthDevices,
} from "@/services/login-service";
import { getServerAssignedDeviceUuid } from "@/lib/session-device-uuid";

function deviceTypeIcon(deviceType: string) {
  const t = deviceType.toLowerCase();
  if (t === "mobile") return Smartphone;
  return MonitorSmartphone;
}

function formatLastSeen(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function OpsActiveDevicesSection() {
  const currentUuid = getServerAssignedDeviceUuid();
  const [devices, setDevices] = useState<ActiveDeviceResponse[]>([]);
  const [allowMultiLogin, setAllowMultiLogin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyUuid, setBusyUuid] = useState<string | null>(null);
  const [confirmUuid, setConfirmUuid] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchActiveAuthDevices();
      setAllowMultiLogin(res.allow_multi_login);
      setDevices(res.devices ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not load devices.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleDeregister = async (deviceUuid: string) => {
    setBusyUuid(deviceUuid);
    try {
      await deregisterAuthDevice(deviceUuid);
      toast.success("Device signed out.");
      setConfirmUuid(null);
      await loadDevices();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not sign out device.";
      toast.error(message);
    } finally {
      setBusyUuid(null);
    }
  };

  const otherDevices = devices.filter((d) => d.uuid !== currentUuid);

  return (
    <section className="space-y-3 rounded-3xl border bg-card/80 p-4 shadow-sm">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Signed-in devices
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {allowMultiLogin
            ? "Multiple devices may stay signed in at once."
            : "Only one session is allowed. Signing in elsewhere may ask you to sign out other devices."}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading devices…
        </div>
      ) : devices.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No active devices.</p>
      ) : (
        <ul className="space-y-2">
          {devices.map((device) => {
            const Icon = deviceTypeIcon(device.device_type);
            const isCurrent =
              device.is_current === true || device.uuid === currentUuid;
            const lastSeen = formatLastSeen(device.last_seen_at);

            return (
              <li
                key={device.uuid}
                className="flex items-start justify-between gap-3 rounded-2xl border bg-muted/20 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium leading-snug">
                      {device.display_label}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {isCurrent ? (
                      <Badge variant="secondary" className="text-[10px]">
                        This device
                      </Badge>
                    ) : null}
                    {device.has_active_session ? (
                      <Badge variant="outline" className="text-[10px]">
                        Signed in
                      </Badge>
                    ) : null}
                  </div>
                  {lastSeen ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Last seen {lastSeen}
                    </p>
                  ) : null}
                </div>
                {!isCurrent ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-rose-600 hover:text-rose-700 dark:text-rose-300"
                    disabled={busyUuid !== null}
                    onClick={() => setConfirmUuid(device.uuid)}
                  >
                    <LogOut className="size-3.5" />
                    Sign out
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !allowMultiLogin && otherDevices.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          To use this account here, sign out a device above or complete sign-in
          and choose devices when prompted.
        </p>
      ) : null}

      <AlertDialog
        open={confirmUuid !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmUuid(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out this device?</AlertDialogTitle>
            <AlertDialogDescription>
              That device will be signed out and must sign in again to use the
              app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyUuid !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busyUuid !== null || !confirmUuid}
              onClick={() => {
                if (confirmUuid) void handleDeregister(confirmUuid);
              }}
            >
              {busyUuid ? (
                <>
                  <Loader2 className="animate-spin" />
                  Signing out…
                </>
              ) : (
                "Sign out device"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
