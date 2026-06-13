import {
  Ban,
  CheckCircle2,
  Clock,
  Cog,
  FileText,
  Key,
  LayoutGrid,
  List,
  ListTodo,
  Loader2,
  Mail,
  Network,
  RotateCw,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type SegmentFilterKind =
  | "all"
  | "status"
  | "source"
  | "job"
  | "task"
  | "view";

const STATUS_ICONS: Record<string, LucideIcon> = {
  success: CheckCircle2,
  failed: XCircle,
  queued: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  retrying: RotateCw,
  cancelled: Ban,
};

const SOURCE_ICONS: Record<string, LucideIcon> = {
  AUTH: Shield,
  EMAIL: Mail,
  USER_ADD: UserPlus,
  USER_ONBOARD: UserCheck,
  USER_UPDATE: UserCog,
  MASTER_UPDATE: FileText,
  INTEGRATION_KEY_UPDATED: Key,
};

const VIEW_ICONS: Record<string, LucideIcon> = {
  activity: List,
  "ip-summary": Network,
};

function normalizeFilterKey(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

export function getSegmentFilterIcon(
  value: string,
  kind: SegmentFilterKind = "all",
): LucideIcon | null {
  if (value === "__all__") return LayoutGrid;

  const lower = value.trim().toLowerCase();
  const upper = normalizeFilterKey(value);

  if (kind === "status" || STATUS_ICONS[lower]) {
    return STATUS_ICONS[lower] ?? null;
  }

  if (kind === "source") {
    return SOURCE_ICONS[upper] ?? Mail;
  }

  if (kind === "view") {
    return VIEW_ICONS[lower] ?? null;
  }

  if (kind === "job") {
    if (lower.includes("email")) return Mail;
    if (lower.includes("approve") || lower.includes("inspection")) {
      return CheckCircle2;
    }
    return Cog;
  }

  if (kind === "task") {
    if (lower.includes("email")) return Mail;
    if (lower.includes("report") || lower.includes("file")) return FileText;
    if (lower.includes("webhook")) return Network;
    return ListTodo;
  }

  return null;
}
