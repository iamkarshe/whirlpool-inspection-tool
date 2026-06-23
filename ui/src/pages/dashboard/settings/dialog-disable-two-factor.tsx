import type { SubmitEvent } from "react";
import { useState } from "react";

import { TotpCodeInput } from "@/components/auth/totp-code-input";
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
import { Loader2 } from "lucide-react";
import { isValidTotpCode } from "@/services/two-factor-api";

export type DialogDisableTwoFactorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  onConfirm: (totpCode: string) => void | Promise<void>;
};

export function DialogDisableTwoFactor({
  open,
  onOpenChange,
  isLoading = false,
  onConfirm,
}: DialogDisableTwoFactorProps) {
  const [totpCode, setTotpCode] = useState("");

  const handleConfirm = async () => {
    if (!isValidTotpCode(totpCode)) return;
    await onConfirm(totpCode);
    setTotpCode("");
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setTotpCode("");
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a current authenticator code to turn off 2FA for your
            account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          className="py-2"
          onSubmit={(event: SubmitEvent) => {
            event.preventDefault();
            void handleConfirm();
          }}
        >
          <TotpCodeInput value={totpCode} onChange={setTotpCode} disabled={isLoading} />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!isValidTotpCode(totpCode) || isLoading}
            onClick={() => void handleConfirm()}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Disabling…
              </>
            ) : (
              "Disable 2FA"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
