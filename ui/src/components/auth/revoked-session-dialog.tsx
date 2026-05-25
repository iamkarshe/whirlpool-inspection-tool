import { AlertCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RevokedSessionDialogProps = {
  open: boolean;
  onAcknowledge: () => void;
};

export function RevokedSessionDialog({
  open,
  onAcknowledge,
}: RevokedSessionDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onAcknowledge();
      }}
    >
      <AlertDialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[22rem]">
        <div className="flex flex-col items-center px-6 pt-8 text-center">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400"
            aria-hidden
          >
            <AlertCircle className="size-7" />
          </div>

          <AlertDialogTitle className="mt-5 w-full text-center text-xl leading-snug">
            Signed out on this device
          </AlertDialogTitle>

          <AlertDialogDescription className="mt-2 w-full max-w-[18rem] text-center text-sm leading-relaxed">
            You have been logged out from this device. Another sign-in may have
            ended this session, or an administrator signed this device out. Sign
            in again to continue.
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="mt-6 flex-row justify-center border-t px-6 py-4">
          <AlertDialogAction
            className="h-10 min-w-[7.5rem] px-8"
            onClick={onAcknowledge}
          >
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
