import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import type { UserResponse } from "@/api/generated/model/userResponse";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  CheckCircle,
  HardHat,
  Shield,
  UserCog,
  XCircle,
} from "lucide-react";
import type { ComponentType } from "react";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "info"
  | "success"
  | "warning";

type RoleBadgeConfig = {
  label: string;
  variant: BadgeVariant;
  className?: string;
  Icon: ComponentType<{ className?: string }>;
};

const ROLE_BADGE_CONFIG: Record<string, RoleBadgeConfig> = {
  Superadmin: {
    label: "SUPERADMIN",
    variant: "info",
    Icon: Shield,
  },
  Manager: {
    label: "MANAGER",
    variant: "default",
    Icon: UserCog,
  },
  Operator: {
    label: "OPERATOR",
    variant: "outline",
    className:
      "border-emerald-400/80 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200",
    Icon: HardHat,
  },
  "Biz Admin": {
    label: "BIZ-ADMIN",
    variant: "outline",
    className:
      "border-amber-400/80 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/45 dark:text-amber-100",
    Icon: Briefcase,
  },
};

function normalizeRoleLabel(role: string): string {
  const lower = role.toLowerCase().trim().replace(/_/g, "-");
  if (lower === "superadmin" || lower === "admin") return "Superadmin";
  if (lower === "manager") return "Manager";
  if (lower === "operator") return "Operator";
  if (lower === "biz-admin") return "Biz Admin";
  return role.trim();
}

export function UserRoleBadge({ role }: { role: string }) {
  const label = normalizeRoleLabel(role);
  const config = ROLE_BADGE_CONFIG[label] ?? {
    label: label.toUpperCase(),
    variant: "secondary" as const,
    Icon: UserCog,
  };

  const Icon = config.Icon;
  return (
    <Badge
      variant={config.variant}
      className={cn(BADGE_ICON_CLASS, config.className)}
    >
      <Icon />
      {config.label}
    </Badge>
  );
}

export function UserDesignationBadge({ designation }: { designation: string }) {
  return (
    <Badge variant="outline" className={BADGE_ICON_CLASS}>
      <Briefcase />
      {designation.toUpperCase()}
    </Badge>
  );
}

export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  const Icon = isActive ? CheckCircle : XCircle;
  return (
    <Badge variant={isActive ? "success" : "destructive"} className={BADGE_ICON_CLASS}>
      <Icon />
      {isActive ? "ACTIVE" : "INACTIVE"}
    </Badge>
  );
}

export function UserBadges({ user }: { user: UserResponse }) {
  return (
    <>
      <UserRoleBadge role={user.role} />
      <UserDesignationBadge designation={user.designation} />
    </>
  );
}
