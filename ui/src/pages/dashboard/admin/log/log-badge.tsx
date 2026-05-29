import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import type { LogLevelKey } from "@/pages/dashboard/admin/log/log-types";
import { AlertTriangle, CircleAlert, Info, Tag } from "lucide-react";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "warning"
  | "info"
  | "success";

const levelVariant: Record<LogLevelKey, BadgeVariant> = {
  info: "info",
  warn: "warning",
  error: "destructive",
};

const levelIcon: Record<
  LogLevelKey,
  React.ComponentType<{ className?: string }>
> = {
  info: Info,
  warn: AlertTriangle,
  error: CircleAlert,
};

const sourceVariant: Record<string, BadgeVariant> = {
  AUTH: "info",
  "USER ADD": "success",
  "USER UPDATE": "secondary",
  "MASTER UPDATE": "default",
  "INTEGRATION KEY UPDATED": "warning",
};

export function LogLevelBadge({ level }: { level: LogLevelKey }) {
  const Icon = levelIcon[level];
  return (
    <Badge variant={levelVariant[level]} className={BADGE_ICON_CLASS}>
      <Icon />
      {level.toUpperCase()}
    </Badge>
  );
}

export function LogSourceBadge({ source }: { source: string }) {
  const normalized = source.trim().toUpperCase();
  const variant = sourceVariant[normalized] ?? "secondary";
  return (
    <Badge variant={variant} className={BADGE_ICON_CLASS}>
      <Tag />
      {normalized}
    </Badge>
  );
}
