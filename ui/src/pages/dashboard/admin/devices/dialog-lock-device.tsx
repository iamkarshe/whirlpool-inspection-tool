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
import { Info } from "lucide-react";

export type DialogLockDeviceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
  onConfirm: (device: Device) => void;
};

export default function DialogLockDevice({
  open,
  onOpenChange,
  device,
  onConfirm,
}: DialogLockDeviceProps) {
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
          <AlertDialogTitle>Lock device?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to lock the device
            {device && (
              <>
                {" "}
                <span className="font-medium">
                  ({device.user_name} – {device.device_fingerprint})
                </span>
              </>
            )}
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert variant="default" className="border-primary/50 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            The user will be logged out from this device and the device will be
            locked. They will need admin approval to use it again.
          </AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Lock device
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
