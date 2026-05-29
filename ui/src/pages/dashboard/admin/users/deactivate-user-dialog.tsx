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

export type DeactivateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  isLoading?: boolean;
  onConfirm: () => boolean | Promise<boolean>;
};

export function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
  isLoading = false,
  onConfirm,
}: DeactivateUserDialogProps) {
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
          <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
          <AlertDialogDescription>
            {user ?
              <>
                You are about to deactivate{" "}
                <span className="font-medium text-foreground">{user.name}</span>
                . They will no longer be able to sign in.
              </>
            : "You are about to deactivate this user."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Before you continue</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              The user will be signed out of all active sessions and will not be
              able to log in until the account is activated again.
            </p>
            <p>
              If a VPN profile was provisioned for this user, the VPN key will
              be revoked and must be re-provisioned after reactivation.
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
            {loading ? "Deactivating…" : "Deactivate user"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
