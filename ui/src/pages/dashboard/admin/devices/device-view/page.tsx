import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGES } from "@/endpoints";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { loadDeviceView } from "@/pages/dashboard/admin/devices/device-view/controller";
import { ArrowLeft, Loader2, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
              <CardTitle>
                {device.user_name} – {device.device_fingerprint}
              </CardTitle>
              <CardDescription>Device ID {device.id}</CardDescription>
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
          <p className="capitalize">{device.device_type}</p>
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

export default function DeviceViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ? Number(params.id) : NaN;
  const [device, setDevice] = useState<Device | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    loadDeviceView(id)
      .then((d) => {
        if (!cancelled) setDevice(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (device === null || device === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Device not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_DEVICES}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to devices
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_DEVICES} aria-label="Back to devices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Device details
          </h1>
          <p className="text-muted-foreground text-sm">
            View and manage this device.
          </p>
        </div>
      </div>
      <DeviceDetailCard device={device} />
    </div>
  );
}
