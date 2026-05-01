import {
  CheckCircle,
  Fingerprint,
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
}: {
  id: string;
  deviceType: DeviceType;
  asLink?: boolean;
}) {
  const Icon = deviceType === "mobile" ? Smartphone : Monitor;
  const content = (
    <Badge
      variant="secondary"
      className={`${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`}
    >
      <Icon />
      <span className="uppercase">{id}</span>
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
  return (
    <Badge
      variant="outline"
      className={`${BADGE_ICON_CLASS} max-w-[200px] truncate`}
    >
      <Fingerprint />
      <span className="uppercase">{fingerprint}</span>
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
