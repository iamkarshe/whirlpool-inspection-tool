import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DeviceFingerprintBadge,
  DeviceHeaderBadges,
  DeviceLockedBadge,
  DeviceStatusBadge,
  DeviceTypeBadge,
  DeviceUserBadge,
} from "@/pages/dashboard/admin/devices/device-badge";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { Smartphone } from "lucide-react";
import { useOutletContext } from "react-router-dom";

type DeviceViewContext = { device: Device };

function DeviceDetailCard({ device }: { device: Device }) {
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
          <div className="flex gap-2">
            <DeviceStatusBadge isActive={device.is_active} />
            <DeviceLockedBadge isLocked={device.is_locked} />
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
  return <DeviceDetailCard device={device} />;
}
