import ConfirmDeleteDialog from "@/components/dialog-confirm-delete";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";

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
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      entityLabel="device"
      title="Delete device?"
      description={
        device
          ? `You are about to permanently delete the device for user ${device.user_name}. This action cannot be undone.`
          : undefined
      }
      confirmLabel="Delete device"
      onConfirm={() => {
        if (!device) return;
        onConfirm(device);
      }}
    />
  );
}
