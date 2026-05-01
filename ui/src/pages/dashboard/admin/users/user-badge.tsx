import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import type { UserResponse } from "@/api/generated/model/userResponse";
import {
  Briefcase,
  CheckCircle,
  Shield,
  User as UserIcon,
  UserCog,
  XCircle,
} from "lucide-react";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "info"
  | "success";

const roleVariant: Record<string, BadgeVariant> = {
  Admin: "info",
  Manager: "default",
  Operator: "secondary",
};

const roleIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  Admin: Shield,
  Manager: UserCog,
  Operator: UserIcon,
};

function normalizeRoleLabel(role: string): string {
  const lower = role.toLowerCase();
  if (lower === "admin") return "Admin";
  if (lower === "manager") return "Manager";
  if (lower === "operator") return "Operator";
  return role;
}

export function UserRoleBadge({ role }: { role: string }) {
  const label = normalizeRoleLabel(role);
  const variant = roleVariant[label] ?? "secondary";
  const Icon = roleIcon[label] ?? UserIcon;
  return (
    <Badge variant={variant} className={BADGE_ICON_CLASS}>
      <Icon />
      {label.toUpperCase()}
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
