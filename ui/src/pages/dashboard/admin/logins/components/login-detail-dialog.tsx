import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import {
  LoginIdBadge,
  LoginIpBadge,
  LoginStatusBadge,
} from "@/pages/dashboard/admin/logins/login-badge";
import { formatLoginIpMetadata } from "@/pages/dashboard/admin/logins/login-format";
import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-types";
import {
  fetchLoginDetail,
  loginApiErrorMessage,
  stringifyLoginDeviceInfo,
} from "@/services/logins-api";
import type { LoginDetailResponse } from "@/api/generated/model/loginDetailResponse";

export type LoginDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  login: LoginActivity | null;
};

function mergeDetailBasics(
  log: LoginActivity,
  d: LoginDetailResponse,
): LoginActivity {
  return {
    ...log,
    ip_address: d.ip_address ?? log.ip_address,
    proxy_ip_address: d.proxy_ip_address ?? log.proxy_ip_address,
    ip_metadata: d.ip_metadata ?? log.ip_metadata,
    external_links: d.external_links ?? log.external_links,
    device_info: d.device_source || log.device_info,
    user_agent: d.user_agent,
    status: d.status,
    success: d.status.toLowerCase() === "successful",
    email: d.email ?? log.email,
    attempted_email: d.attempted_email ?? log.attempted_email,
    login_method: d.login_method ?? log.login_method,
    failure_reason: d.failure_reason ?? log.failure_reason,
  };
}

export default function LoginDetailDialog({
  open,
  onOpenChange,
  login,
}: LoginDetailDialogProps) {
  const [detail, setDetail] = useState<LoginDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !login?.uuid) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    fetchLoginDetail(login.uuid)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDetailError(loginApiErrorMessage(e, "Could not load login detail."));
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, login?.uuid]);

  const displayLogin =
    login && detail ? mergeDetailBasics(login, detail) : login;
  const locationLabel = formatLoginIpMetadata(displayLogin?.ip_metadata);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Login details</DialogTitle>
        </DialogHeader>
        {displayLogin ? (
          <div className="grid gap-3 py-2 text-sm">
            {detailError ? (
              <p className="text-destructive text-sm">{detailError}</p>
            ) : null}
            {detailLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : null}
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">ID</span>
              <LoginIdBadge id={displayLogin.id} />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Reference</span>
              <LoginIdBadge id={displayLogin.reference_id} />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">UUID</span>
              <span className="font-mono text-xs break-all">{displayLogin.uuid}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">User</span>
              <span>{displayLogin.user_name}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Email</span>
              <span className="break-all">{displayLogin.email || "—"}</span>
            </div>
            {displayLogin.attempted_email?.trim() ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Attempted email</span>
                <span className="break-all">{displayLogin.attempted_email}</span>
              </div>
            ) : null}
            {displayLogin.login_method?.trim() ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Method</span>
                <span>{displayLogin.login_method}</span>
              </div>
            ) : null}
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Logged at</span>
              <span className="font-mono text-xs">
                {formatDate(displayLogin.logged_at)}
              </span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">IP address</span>
              {displayLogin.ip_address?.trim() ? (
                <LoginIpBadge ip={displayLogin.ip_address} />
              ) : (
                <span>—</span>
              )}
            </div>
            {locationLabel ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Location</span>
                <span className="text-muted-foreground text-xs">{locationLabel}</span>
              </div>
            ) : null}
            {detail?.proxy_ip_address?.trim() ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Proxy IP</span>
                <LoginIpBadge ip={detail.proxy_ip_address} />
              </div>
            ) : null}
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Device / Source</span>
              <span className="break-words">{displayLogin.device_info || "—"}</span>
            </div>
            {detail ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Device info (raw)</span>
                <span className="break-all font-mono text-xs">
                  {stringifyLoginDeviceInfo(detail.device_info) || "—"}
                </span>
              </div>
            ) : null}
            {displayLogin.user_agent ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">User agent</span>
                <span className="break-all">{displayLogin.user_agent}</span>
              </div>
            ) : null}
            {displayLogin.failure_reason?.trim() ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Failure reason</span>
                <span className="break-words">{displayLogin.failure_reason}</span>
              </div>
            ) : null}
            {detail != null ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Inspections</span>
                <span>{detail.inspections_done}</span>
              </div>
            ) : null}
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Status</span>
              <LoginStatusBadge success={displayLogin.success} />
            </div>
            {detail?.inspections?.length ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Related</span>
                <div className="flex flex-col gap-1">
                  {detail.inspections.map((insp) => (
                    <Link
                      key={insp.uuid}
                      to={PAGES.inspectionViewPath(insp.uuid)}
                      className="text-primary text-xs hover:underline"
                    >
                      {insp.uuid}
                    </Link>
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
