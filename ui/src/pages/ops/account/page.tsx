import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
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
import { useSessionUser } from "@/hooks/use-session-user";
import { getOrCreatePersistentDeviceId } from "@/lib/device-fingerprint";
import {
  formatOpsRoleBadgeLabel,
  userInitialsFromName,
} from "@/lib/ops-user-display";
import { clearAuthenticatedSession } from "@/services/login-service";

type ConfirmAction = "logout" | null;

function shortenMiddle(value: string, head = 10, tail = 6): string {
  const t = value.trim();
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

export default function OpsAccountPage() {
  const navigate = useNavigate();
  const user = useSessionUser();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [deviceFingerprint] = useState(() => {
    try {
      return typeof window === "undefined"
        ? ""
        : getOrCreatePersistentDeviceId();
    } catch {
      return "";
    }
  });
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const handleConfirmLogout = () => {
    clearAuthenticatedSession();
    setConfirmAction(null);
    navigate(PAGES.LOGIN, { replace: true });
  };

  if (!user) {
    return (
      <div className="space-y-4 rounded-3xl border bg-card/80 p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Profile data is unavailable. Sign in again to continue.
        </p>
        <Button asChild>
          <Link to={PAGES.LOGIN}>Go to login</Link>
        </Button>
      </div>
    );
  }

  const initials = userInitialsFromName(user.name);
  const roleLabel = formatOpsRoleBadgeLabel(user.role);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Signed in as
            </p>
            <p className="text-lg font-semibold leading-tight">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            {initials}
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-3 mt-3">
          <Badge
            variant="secondary"
            className="shrink-0 font-semibold uppercase tracking-wide"
          >
            {roleLabel}
          </Badge>
          {user.designation ? (
            <p className="min-w-0 max-w-[58%] text-right text-xs text-muted-foreground">
              {user.designation}
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Account details
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">App User ID</dt>
            <dd className="font-mono font-medium">
              #WPDI-{user.id.toString().padStart(4, "0")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <span
                className={
                  user.is_active
                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
                    : "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                }
              >
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          This device
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">Fingerprint</dt>
            <dd
              className="max-w-[min(220px,70vw)] break-all font-mono text-xs text-right"
              title={deviceFingerprint || undefined}
            >
              {deviceFingerprint
                ? shortenMiddle(deviceFingerprint, 10, 10)
                : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Network</dt>
            <dd>
              <span
                className={
                  online
                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
                    : "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200"
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                {online ? "Online" : "Offline"}
              </span>
            </dd>
          </div>
        </dl>
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
              You will be signed out and any unsynced inspections may need to be
              uploaded again after login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmLogout}>
              Yes, log me out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
