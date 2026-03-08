import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { ClipboardList } from "lucide-react";
import { useOutletContext } from "react-router-dom";

type DeviceViewContext = { device: Device };

export default function DeviceViewInspectionsPage() {
  const { device } = useOutletContext<DeviceViewContext>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Inspections
        </CardTitle>
        <CardDescription>
          Inspections performed on this device ({device.user_name} –{" "}
          {device.device_fingerprint}). List will be wired to the API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          No inspections to show yet. This section will list inspections linked
          to device ID {device.id}.
        </p>
      </CardContent>
    </Card>
  );
}
