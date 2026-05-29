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
import type { UserResponse } from "@/api/generated/model/userResponse";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";

export type RevokeUserVpnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  isLoading?: boolean;
  onConfirm: () => boolean | Promise<boolean>;
};

export function RevokeUserVpnDialog({
  open,
  onOpenChange,
  user,
  isLoading = false,
  onConfirm,
}: RevokeUserVpnDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading || internalLoading;

  const handleConfirm = async () => {
    try {
      if (!isLoading) setInternalLoading(true);
      const success = await onConfirm();
      if (success) onOpenChange(false);
    } finally {
      if (!isLoading) setInternalLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke VPN profile?</AlertDialogTitle>
          <AlertDialogDescription>
            {user ?
              <>
                You are about to revoke the WireGuard VPN profile for{" "}
                <span className="font-medium text-foreground">{user.name}</span>
                .
              </>
            : "You are about to revoke this user's VPN profile."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Before you continue</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              The VPN key will be invalidated on the server and the user will
              lose warehouse VPN access until a new profile is provisioned.
            </p>
            <p>
              Existing config files and QR codes for this profile will no longer
              work.
            </p>
          </AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? "Revoking…" : "Revoke VPN"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
