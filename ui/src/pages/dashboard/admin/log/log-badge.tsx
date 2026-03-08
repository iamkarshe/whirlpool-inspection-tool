import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import type { Log } from "@/pages/dashboard/admin/log/log-service";
import { AlertTriangle, Info, Tag } from "lucide-react";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "warning"
  | "info"
  | "success";

const levelVariant: Record<Log["level"], BadgeVariant> = {
  info: "info",
  warn: "warning",
  error: "destructive",
};

const levelIcon: Record<Log["level"], React.ComponentType<{ className?: string }>> = {
  info: Info,
  warn: AlertTriangle,
  error: CircleAlert,
};

const sourceVariant: Record<string, BadgeVariant> = {
  auth: "info",
  devices: "success",
  inspections: "default",
  masters: "secondary",
  reports: "info",
  storage: "warning",
};

export function LogLevelBadge({ level }: { level: Log["level"] }) {
  const Icon = levelIcon[level];
  return (
    <Badge variant={levelVariant[level]} className={BADGE_ICON_CLASS}>
      <Icon />
      {level}
    </Badge>
  );
}

export function LogSourceBadge({ source }: { source: string }) {
  const variant = sourceVariant[source] ?? "secondary";
  return (
    <Badge variant={variant} className={BADGE_ICON_CLASS}>
      <Tag />
      {source.toUpperCase()}
    </Badge>
  );
}
