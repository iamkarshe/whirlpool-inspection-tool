import {
  CheckCircle,
  Lock,
  Monitor,
  Smartphone,
  Unlock,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import type {
  Device,
  DeviceType,
} from "@/pages/dashboard/admin/devices/device-service";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "info"
  | "success";

const deviceTypeVariant: Record<DeviceType, BadgeVariant> = {
  mobile: "success",
  desktop: "info",
};

export function DeviceIdBadge({
  id,
  deviceType,
  asLink = true,
  /** Admin UI: show phone icon for device UUID rows (matches fingerprint badges). */
  alwaysUseMobileIcon = false,
}: {
  id: string;
  deviceType: DeviceType;
  asLink?: boolean;
  alwaysUseMobileIcon?: boolean;
}) {
  const Icon =
    alwaysUseMobileIcon || deviceType === "mobile" ? Smartphone : Monitor;
  const content = (
    <Badge
      variant="secondary"
      title={id}
      className={`${BADGE_ICON_CLASS} max-w-[min(100%,14rem)] min-w-0 cursor-pointer font-mono normal-case transition-colors hover:bg-primary/15 hover:text-primary`}
    >
      <Icon className="shrink-0" />
      <span className="min-w-0 shrink truncate">{id}</span>
    </Badge>
  );
  if (asLink) {
    return (
      <Link to={PAGES.deviceViewPath(id)} className="inline-block">
        {content}
      </Link>
    );
  }
  return content;
}

export function DeviceTypeBadge({ deviceType }: { deviceType: DeviceType }) {
  const variant = deviceTypeVariant[deviceType];
  const Icon = deviceType === "mobile" ? Smartphone : Monitor;
  return (
    <Badge variant={variant} className={BADGE_ICON_CLASS}>
      <Icon />
      {deviceType.toUpperCase()}
    </Badge>
  );
}

export function DeviceStatusBadge({ isActive }: { isActive: boolean }) {
  const Icon = isActive ? CheckCircle : XCircle;
  return (
    <Badge
      variant={isActive ? "success" : "destructive"}
      className={BADGE_ICON_CLASS}
    >
      <Icon />
      {isActive ? "ACTIVE" : "INACTIVE"}
    </Badge>
  );
}

export function DeviceLockedBadge({ isLocked }: { isLocked: boolean }) {
  const Icon = isLocked ? Lock : Unlock;
  return (
    <Badge
      variant={isLocked ? "destructive" : "secondary"}
      className={BADGE_ICON_CLASS}
    >
      <Icon />
      {isLocked ? "LOCKED" : "UNLOCKED"}
    </Badge>
  );
}

export function DeviceUserBadge({
  userName,
  userUuid,
  asLink = false,
}: {
  userName: string;
  /** When set with asLink, wraps the badge in a profile link. */
  userUuid?: string | null;
  asLink?: boolean;
}) {
  const content = (
    <Badge variant="secondary" className={BADGE_ICON_CLASS}>
      <UserIcon />
      <span className="uppercase">{userName}</span>
    </Badge>
  );
  const uuid = userUuid?.trim();
  if (asLink && uuid) {
    return (
      <Link
        to={PAGES.userViewPath(uuid)}
        title={`Open user ${userName}`}
        className="inline-block cursor-pointer transition-colors hover:text-primary"
      >
        {content}
      </Link>
    );
  }
  return content;
}

export function DeviceFingerprintBadge({
  fingerprint,
}: {
  fingerprint: string;
}) {
  const fp = fingerprint?.trim() ?? "";
  return (
    <Badge
      variant="outline"
      title={fp.length > 0 ? fp : undefined}
      className={`${BADGE_ICON_CLASS} max-w-[min(100%,16rem)] font-mono normal-case`}
    >
      <Smartphone className="shrink-0 text-muted-foreground" />
      <span className="min-w-0 shrink truncate normal-case">{fp || "—"}</span>
    </Badge>
  );
}

export function DeviceHeaderBadges({ device }: { device: Device }) {
  return (
    <>
      <DeviceUserBadge
        userName={device.user_name}
        userUuid={device.user_uuid}
        asLink
      />
    </>
  );
}
