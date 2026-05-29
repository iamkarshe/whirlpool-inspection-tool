import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "warning"
  | "info"
  | "success";

export function JobLogStatusBadge({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  const success = normalized === "success";
  const variant: BadgeVariant = success ? "success" : "destructive";
  const Icon = success ? CheckCircle2 : XCircle;
  return (
    <Badge variant={variant} className={BADGE_ICON_CLASS}>
      <Icon />
      {normalized}
    </Badge>
  );
}
