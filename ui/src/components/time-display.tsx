import type { ReactNode } from "react";

import { formatDateCompact, formatDateHumanized } from "@/lib/core";
import { cn } from "@/lib/utils";

export type TimeDisplayProps = {
  iso: string | null | undefined;
  className?: string;
  fallback?: ReactNode;
};

export function TimeDisplay({
  iso,
  className,
  fallback = "—",
}: TimeDisplayProps) {
  const trimmed = iso?.trim();
  if (!trimmed) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>
        {fallback}
      </span>
    );
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>
        {trimmed}
      </span>
    );
  }

  return (
    <time
      dateTime={trimmed}
      title={formatDateCompact(trimmed)}
      className={cn("text-muted-foreground text-sm", className)}
    >
      {formatDateHumanized(trimmed)}
    </time>
  );
}
