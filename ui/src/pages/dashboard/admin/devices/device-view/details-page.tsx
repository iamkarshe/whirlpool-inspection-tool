import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
              <CardTitle>Device {device.id.slice(0, 8)}…</CardTitle>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="font-normal">
                  {device.user_name}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs font-normal">
                  {device.device_fingerprint}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={device.is_active ? "success" : "destructive"}>
              {device.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant={device.is_locked ? "destructive" : "secondary"}>
              {device.is_locked ? "Locked" : "Unlocked"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">User</p>
          <p className="font-medium">{device.user_name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">IMEI</p>
          <p className="font-mono text-sm">{device.imei}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Type</p>
          <Badge variant="outline" className="capitalize font-normal">
            {device.device_type}
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Fingerprint</p>
          <p className="max-w-[240px] truncate font-mono text-xs">
            {device.device_fingerprint}
          </p>
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
