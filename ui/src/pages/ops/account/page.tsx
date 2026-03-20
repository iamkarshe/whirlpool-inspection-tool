import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAGES } from "@/endpoints";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type ConfirmAction = "logout" | null;

export default function OpsAccountPage() {
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const handleConfirm = () => {
    // TODO: wire to real logout flow
    setConfirmAction(null);
    navigate(PAGES.LOGIN);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Signed in as
            </p>
            <p className="mt-1 text-base font-semibold">Warehouse Operator</p>
            <p className="text-xs text-muted-foreground">whirlpool.operator@example.com</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            WO
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Device fingerprint
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Full name</span>
            <span className="font-medium">Warehouse Operator</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Mobile fingerprint</span>
            <span className="font-mono text-xs">a1c9-92ff-4b7e-ops1</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Active IP</span>
            <span className="font-mono text-xs">192.168.10.24</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Central server</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
            <LogOut className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Session</p>
            <p className="text-xs text-muted-foreground">
              End your shift safely from this device.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmAction("logout")}
          className="flex w-full items-center justify-between rounded-2xl bg-rose-500/5 px-3 py-3 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-300"
        >
          <span>Log out from this device</span>
        </button>
      </section>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out from this device?</DialogTitle>
            <DialogDescription>
              You will be signed out and any unsynced inspections may need to be uploaded again
              after login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Yes, log me out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



