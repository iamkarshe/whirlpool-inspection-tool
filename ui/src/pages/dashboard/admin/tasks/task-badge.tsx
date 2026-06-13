import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { ComponentType } from "react";

type TaskStatusConfig = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
  className?: string;
  Icon: ComponentType<{ className?: string }>;
};

const STATUS_CONFIG: Record<string, TaskStatusConfig> = {
  queued: {
    label: "QUEUED",
    variant: "secondary",
    Icon: Clock3,
  },
  processing: {
    label: "PROCESSING",
    variant: "info",
    Icon: Loader2,
  },
  completed: {
    label: "COMPLETED",
    variant: "success",
    Icon: CheckCircle2,
  },
  failed: {
    label: "FAILED",
    variant: "destructive",
    Icon: XCircle,
  },
  retrying: {
    label: "RETRYING",
    variant: "warning",
    Icon: RotateCcw,
  },
  cancelled: {
    label: "CANCELLED",
    variant: "outline",
    Icon: AlertCircle,
  },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const key = status.trim().toLowerCase();
  const config = STATUS_CONFIG[key] ?? {
    label: status.toUpperCase(),
    variant: "secondary" as const,
    Icon: Clock3,
  };
  const Icon = config.Icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(BADGE_ICON_CLASS, config.className)}
    >
      <Icon className={key === "processing" ? "animate-spin" : undefined} />
      {config.label}
    </Badge>
  );
}
