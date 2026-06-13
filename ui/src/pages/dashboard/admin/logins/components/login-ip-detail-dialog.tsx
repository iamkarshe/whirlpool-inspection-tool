import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimeDisplay } from "@/components/time-display";
import {
  LoginIpBadge,
  LoginStatusBadge,
} from "@/pages/dashboard/admin/logins/login-badge";
import { formatLoginIpMetadata } from "@/pages/dashboard/admin/logins/login-format";
import {
  fetchLoginIpDetail,
  loginApiErrorMessage,
} from "@/services/logins-api";
import type { LoginIpDetailResponse } from "@/api/generated/model/loginIpDetailResponse";

export type LoginIpDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ipAddress: string | null;
};

function healthBadgeVariant(status: string) {
  const key = status.toLowerCase();
  if (key === "abusive") return "destructive" as const;
  if (key === "suspicious") return "warning" as const;
  return "secondary" as const;
}

export default function LoginIpDetailDialog({
  open,
  onOpenChange,
  ipAddress,
}: LoginIpDetailDialogProps) {
  const [detail, setDetail] = useState<LoginIpDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ip = ipAddress?.trim();
    if (!open || !ip) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLoginIpDetail(ip)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setError(loginApiErrorMessage(e, "Could not load IP details."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, ipAddress]);

  const refreshGeo = () => {
    const ip = ipAddress?.trim();
    if (!ip) return;
    setLoading(true);
    setError(null);
    fetchLoginIpDetail(ip, { refresh_metadata: true })
      .then(setDetail)
      .catch((e: unknown) => {
        setDetail(null);
        setError(loginApiErrorMessage(e, "Could not load IP details."));
      })
      .finally(() => setLoading(false));
  };

  const health = detail?.health;
  const locationLabel = formatLoginIpMetadata(health?.ip_metadata);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>IP investigation</DialogTitle>
        </DialogHeader>
        {ipAddress?.trim() ? (
          <div className="space-y-4 text-sm">
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            {loading && !detail ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : null}
            {health ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <LoginIpBadge ip={health.ip_address} />
                  <Badge variant={healthBadgeVariant(health.health_status)}>
                    {health.health_status}
                  </Badge>
                  {health.is_abusive ? (
                    <Badge variant="destructive">Abusive</Badge>
                  ) : null}
                </div>
                {locationLabel ? (
                  <p className="text-muted-foreground text-xs">{locationLabel}</p>
                ) : null}
                {health.abusive_reasons?.length ? (
                  <p className="text-muted-foreground text-xs">
                    Reasons: {health.abusive_reasons.join(", ")}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Total logins</p>
                    <p className="font-semibold">{health.total_logins}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Successful</p>
                    <p className="font-semibold">{health.successful_logins}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Failed</p>
                    <p className="font-semibold">{health.failed_logins}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Unique users</p>
                    <p className="font-semibold">{health.unique_users}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">First seen </span>
                    <TimeDisplay iso={health.first_seen_at} />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last seen </span>
                    <TimeDisplay iso={health.last_seen_at} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={health.external_links.ipinfo}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open IPinfo
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={health.external_links.abuseipdb}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open AbuseIPDB
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={loading}
                    onClick={refreshGeo}
                  >
                    Refresh geo
                  </Button>
                </div>
                {detail.metadata_refresh_queued ? (
                  <p className="text-muted-foreground text-xs">
                    Geolocation refresh queued — check again in a few seconds.
                  </p>
                ) : null}
              </>
            ) : null}
            {detail?.recent_logins?.length ? (
              <div className="space-y-2">
                <p className="font-medium">Recent logins</p>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                  {detail.recent_logins.slice(0, 10).map((row) => (
                    <div
                      key={row.uuid}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium">{row.user_name}</span>
                      <span className="text-muted-foreground">
                      <TimeDisplay iso={row.logged_at} />
                      </span>
                      <LoginStatusBadge
                        success={row.status.toLowerCase() === "successful"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
