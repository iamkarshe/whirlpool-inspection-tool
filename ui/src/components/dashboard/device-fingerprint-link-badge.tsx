import { Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import { cn } from "@/lib/utils";

const badgeClass =
  "inline-flex min-w-0 max-w-[min(100%,16rem)] items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-medium font-mono normal-case [&>svg]:size-3.5 [&>svg]:shrink-0";

type DeviceFingerprintLinkBadgeProps = {
  /** `devices.uuid` — click opens `PAGES.deviceViewPath(uuid)` (never numeric PK). */
  deviceUuid: string;
  fingerprint: string;
  className?: string;
};

/**
 * Truncated device fingerprint in an outline badge with a mobile icon. When
 * `deviceUuid` is non-empty, the badge links via `PAGES.deviceViewPath(deviceUuid)`.
 */
export function DeviceFingerprintLinkBadge({
  deviceUuid,
  fingerprint,
  className,
}: DeviceFingerprintLinkBadgeProps) {
  const id = deviceUuid?.trim();
  const fp = fingerprint?.trim() ?? "";
  const label = fp.length > 0 ? fp : "—";
  const deviceHref = id ? PAGES.deviceViewPath(id) : "";

  const badge = (
    <Badge
      variant="outline"
      className={cn(badgeClass, id && "cursor-pointer hover:bg-accent")}
      title={fp.length > 0 ? fp : undefined}
    >
      <Smartphone className="shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 shrink truncate">{label}</span>
    </Badge>
  );

  if (!id) {
    return <span className={cn("inline-flex", className)}>{badge}</span>;
  }

  return (
    <Link
      to={deviceHref}
      className={cn("inline-flex min-w-0 max-w-[min(100%,16rem)]", className)}
      title={fp.length > 0 ? fp : undefined}
    >
      {badge}
    </Link>
  );
}
