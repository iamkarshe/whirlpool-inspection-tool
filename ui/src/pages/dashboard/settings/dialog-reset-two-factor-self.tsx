import type { ChangeEvent, SubmitEvent } from "react";
import { useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export type DialogResetTwoFactorSelfProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  onConfirm: (currentPassword: string) => void | Promise<void>;
};

export function DialogResetTwoFactorSelf({
  open,
  onOpenChange,
  isLoading = false,
  onConfirm,
}: DialogResetTwoFactorSelfProps) {
  const [password, setPassword] = useState("");

  const handleConfirm = async () => {
    if (!password.trim()) return;
    await onConfirm(password);
    setPassword("");
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setPassword("");
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset two-factor authentication?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes your current authenticator pairing. Enter your account
            password to continue. If 2FA is still required by your administrator,
            you will need to set it up again before your next sign-in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          className="space-y-2 py-2"
          onSubmit={(event: SubmitEvent) => {
            event.preventDefault();
            void handleConfirm();
          }}
        >
          <Label htmlFor="reset-2fa-password">Current password</Label>
          <Input
            id="reset-2fa-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setPassword(event.target.value)
            }
            disabled={isLoading}
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!password.trim() || isLoading}
            onClick={() => void handleConfirm()}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Resetting…
              </>
            ) : (
              "Reset 2FA"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
