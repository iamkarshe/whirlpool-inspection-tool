import { Lock, MoreHorizontal, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
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

function DeviceDetailCard({
  device,
  onLockClick,
  onDeleteClick,
}: {
  device: Device;
  onLockClick: () => void;
  onDeleteClick: () => void;
}) {
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
          <DeviceUserBadge userName={device.user_name} />
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
          <p className="text-sm">{device.device_info || "—"}</p>
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
