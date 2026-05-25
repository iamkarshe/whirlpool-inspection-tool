import { Loader2, MonitorSmartphone, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { LoginResponse } from "@/api/generated/model/loginResponse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  canCallDeviceResolve,
  getCurrentDeviceUuidFromLogin,
  getLoginActiveDevices,
  resolveLoginDevices,
} from "@/services/login-service";

type DeviceSelectionDialogProps = {
  open: boolean;
  login: LoginResponse | null;
  onResolved: () => void;
  onCancel: () => void;
};

function formatLastSeen(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function deviceTypeIcon(deviceType: string) {
  const t = deviceType.toLowerCase();
  if (t === "mobile") return Smartphone;
  return MonitorSmartphone;
}

export function DeviceSelectionDialog({
  open,
  login,
  onResolved,
  onCancel,
}: DeviceSelectionDialogProps) {
  const devices = useMemo(
    () => (login ? getLoginActiveDevices(login) : []),
    [login],
  );
  const currentDeviceUuid = login ? getCurrentDeviceUuidFromLogin(login) : null;
  const allowMultiLogin = login?.allow_multi_login === true;

  const [selectedUuid, setSelectedUuid] = useState<string>("");
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!open || !login) return;
    setSelectedUuid(getCurrentDeviceUuidFromLogin(login) ?? "");
  }, [open, login]);

  const canContinueHere =
    Boolean(selectedUuid) &&
    (!currentDeviceUuid || selectedUuid === currentDeviceUuid);

  const handleConfirm = async () => {
    if (!login) return;
    if (!canCallDeviceResolve(allowMultiLogin)) {
      onResolved();
      return;
    }
    if (!selectedUuid) {
      toast.error("Select the device that should stay signed in.");
      return;
    }

    if (!canContinueHere) {
      toast.error(
        "Sign-in cancelled. Select “This device” to stay signed in on this browser.",
      );
      onCancel();
      return;
    }

    setIsResolving(true);
    try {
      const result = await resolveLoginDevices([selectedUuid]);
      const removed = result.deregistered_device_uuids?.length ?? 0;
      if (removed > 0) {
        toast.success(
          removed === 1
            ? "The other device was signed out."
            : `${removed} other devices were signed out.`,
        );
      }
      onResolved();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not update devices.";
      toast.error(message);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isResolving) onCancel();
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
        )}
        showCloseButton={!isResolving}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b px-6 pt-6 pr-12 pb-4 text-left">
          <DialogTitle>Select device to continue</DialogTitle>
          <DialogDescription>
            Another device is already signed in. Only one device can stay
            active—select which one to keep.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4",
            "[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
          )}
        >
          {devices.length === 0 ? (
            <p className="rounded-2xl border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
              No active devices were returned. Try again or contact support.
            </p>
          ) : (
            <RadioGroup
              value={selectedUuid}
              onValueChange={setSelectedUuid}
              className="space-y-2"
              disabled={isResolving}
            >
              {devices.map((device) => {
                const Icon = deviceTypeIcon(device.device_type);
                const isCurrent =
                  device.is_current === true ||
                  device.uuid === currentDeviceUuid;
                const lastSeen = formatLastSeen(device.last_seen_at);
                const isSelected = selectedUuid === device.uuid;

                return (
                  <label
                    key={device.uuid}
                    htmlFor={`device-keep-${device.uuid}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition-colors",
                      isSelected ? "border-primary/40 bg-primary/5" : "bg-card",
                      isCurrent && "ring-1 ring-primary/25",
                    )}
                  >
                    <RadioGroupItem
                      id={`device-keep-${device.uuid}`}
                      value={device.uuid}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium leading-snug">
                          {device.display_label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {isCurrent ? (
                          <Badge
                            variant="warning"
                            className="text-[10px] font-semibold shadow-sm ring-1 ring-yellow-500/30"
                          >
                            This device
                          </Badge>
                        ) : null}
                        {device.has_active_session ? (
                          <Badge variant="outline" className="text-[10px]">
                            Signed in
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {device.device_type}
                        </Badge>
                      </div>
                      {lastSeen ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Last seen {lastSeen}
                        </p>
                      ) : null}
                      {!isCurrent && isSelected ? (
                        <p className="mt-2 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                          Keeping this device will cancel sign-in on this
                          browser.
                        </p>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isResolving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={isResolving || !canContinueHere}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {isResolving ? (
              <>
                <Loader2 className="animate-spin" />
                Continuing…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
