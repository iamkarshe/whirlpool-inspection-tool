import { Lock, MoreHorizontal, Smartphone, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import {
  DeviceFingerprintBadge,
  DeviceHeaderBadges,
  DeviceLockedBadge,
  DeviceStatusBadge,
  DeviceTypeBadge,
  DeviceUserBadge,
} from "@/pages/dashboard/admin/devices/device-badge";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import DialogDeleteDevice from "@/pages/dashboard/admin/devices/dialog-delete-device";
import DialogLockDevice from "@/pages/dashboard/admin/devices/dialog-lock-device";

type DeviceViewContext = { device: Device };

type DeviceInfoRow = { key: string; value: string };

function stringifyDeviceInfoValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function flattenDeviceInfo(value: unknown, prefix = ""): DeviceInfoRow[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ key: prefix || "value", value: "[]" }];
    return value.flatMap((entry, index) =>
      flattenDeviceInfo(entry, `${prefix}[${index}]`),
    );
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return [{ key: prefix || "value", value: "{}" }];
    return entries.flatMap(([entryKey, entryValue]) =>
      flattenDeviceInfo(
        entryValue,
        prefix ? `${prefix}.${entryKey}` : entryKey,
      ),
    );
  }
  return [{ key: prefix || "value", value: stringifyDeviceInfoValue(value) }];
}

function parseDeviceInfoRows(raw: string): DeviceInfoRow[] | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return flattenDeviceInfo(parsed);
  } catch {
    return null;
  }
}

function DeviceDetailCard({
  device,
  onLockClick,
  onDeleteClick,
}: {
  device: Device;
  onLockClick: () => void;
  onDeleteClick: () => void;
}) {
  const deviceInfoRows = parseDeviceInfoRows(device.device_info);
  const [showAllDeviceInfo, setShowAllDeviceInfo] = useState(false);
  const visibleDeviceInfoRows = useMemo(
    () =>
      showAllDeviceInfo || !deviceInfoRows
        ? deviceInfoRows
        : deviceInfoRows.slice(0, 5),
    [deviceInfoRows, showAllDeviceInfo],
  );
  const canExpandDeviceInfo = (deviceInfoRows?.length ?? 0) > 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <Smartphone className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Device {device.id}</CardTitle>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <DeviceHeaderBadges device={device} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DeviceStatusBadge isActive={device.is_active} />
            <DeviceLockedBadge isLocked={device.is_locked} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <span className="sr-only">Actions</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onLockClick}
                  className="text-amber-600 focus:text-amber-600"
                >
                  <Lock className="mr-2 h-4 w-4 text-amber-600" />
                  Lock device
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDeleteClick}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                  Delete device
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">User</p>
          <DeviceUserBadge userName={device.user_name} userId={device.user_id} asLink />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">IMEI</p>
          <p className="font-mono text-sm">{device.imei}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Type</p>
          <DeviceTypeBadge deviceType={device.device_type} />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Fingerprint</p>
          <DeviceFingerprintBadge fingerprint={device.device_fingerprint} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <p className="text-muted-foreground text-sm">Device info</p>
          {deviceInfoRows ? (
            <div className="space-y-2">
              <div className="relative overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="w-[35%] px-3 py-2 text-left font-medium">
                        Key
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDeviceInfoRows?.map((row, index) => (
                      <tr key={`${row.key}-${index}`} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">
                          {row.key}
                        </td>
                        <td className="px-3 py-2 break-all">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {canExpandDeviceInfo && !showAllDeviceInfo ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/95 to-transparent" />
                ) : null}
              </div>
              {canExpandDeviceInfo ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowAllDeviceInfo((prev) => !prev)}
                >
                  {showAllDeviceInfo ? "View less" : "View more"}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm">{device.device_info || "—"}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeviceViewDetailsPage() {
  const { device } = useOutletContext<DeviceViewContext>();
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <DeviceDetailCard
        device={device}
        onLockClick={() => setLockDialogOpen(true)}
        onDeleteClick={() => setDeleteDialogOpen(true)}
      />
      <DialogLockDevice
        open={lockDialogOpen}
        onOpenChange={setLockDialogOpen}
        device={device}
        onConfirm={(d) => {
          // TODO: wire lock device API
          console.log("Lock device", d);
        }}
      />
      <DialogDeleteDevice
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        device={device}
        onConfirm={(d) => {
          // TODO: wire delete device API
          console.log("Delete device", d);
          navigate(PAGES.DASHBOARD_ADMIN_DEVICES);
        }}
      />
    </>
  );
}
