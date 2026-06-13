import { Loader2, Mail } from "lucide-react";

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

export type DialogResendOnboardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  isLoading?: boolean;
  onConfirm: (user: UserResponse) => void | Promise<void>;
};

export function DialogResendOnboard({
  open,
  onOpenChange,
  user,
  isLoading = false,
  onConfirm,
}: DialogResendOnboardProps) {
  const isResend = user?.must_change_password === true;

  const handleConfirm = async () => {
    if (!user) return;
    await onConfirm(user);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isResend ? "Resend onboarding email?" : "Send onboarding email?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? isResend
                ? `This generates a new temporary password for ${user.name} (${user.email}) and invalidates the previous one. A fresh welcome email will be sent.`
                : `Send a welcome email with a temporary password to ${user.name} (${user.email}). The user must change their password on first login.`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isLoading || !user} onClick={handleConfirm}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                {isResend ? "Resend email" : "Send email"}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
