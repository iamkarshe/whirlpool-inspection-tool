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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { TriangleAlert } from "lucide-react";

export type DialogDeleteDeviceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
  onConfirm: (device: Device) => void;
};

export default function DialogDeleteDevice({
  open,
  onOpenChange,
  device,
  onConfirm,
}: DialogDeleteDeviceProps) {
  const handleConfirm = () => {
    if (device) {
      onConfirm(device);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete device?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete the device
            {device && (
              <>
                {" "}
                <span className="font-medium">
                  ({device.user_name} – {device.device_fingerprint})
                </span>
              </>
            )}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            The device will be removed from the system. Any inspection or login
            history tied to this device may be affected.
          </AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete device
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
