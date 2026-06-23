import { Loader2, ShieldOff } from "lucide-react";

import type { UserResponse } from "@/api/generated/model/userResponse";
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

export type DialogResetUserTwoFactorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  isLoading?: boolean;
  onConfirm: (user: UserResponse) => void | Promise<void>;
};

export function DialogResetUserTwoFactor({
  open,
  onOpenChange,
  user,
  isLoading = false,
  onConfirm,
}: DialogResetUserTwoFactorProps) {
  const handleConfirm = async () => {
    if (!user) return;
    await onConfirm(user);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset two-factor authentication?</AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? `This clears 2FA for ${user.name} (${user.email}). They will need to set up a new authenticator on next sign-in if enforcement is still enabled.`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isLoading || !user} onClick={() => void handleConfirm()}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Resetting…
              </>
            ) : (
              <>
                <ShieldOff className="h-4 w-4" />
                Reset 2FA
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
