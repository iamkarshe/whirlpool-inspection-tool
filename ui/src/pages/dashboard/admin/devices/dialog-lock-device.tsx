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
            You are about to lock the device for user
            {device && (
              <>
                {" "}
                <span className="font-medium">{device.user_name}</span>
              </>
            )}
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert
          variant="default"
          className="border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-200"
        >
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-300" />
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
            className="bg-amber-500 text-amber-950 hover:bg-amber-500/90 dark:text-amber-50"
          >
            Lock device
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
