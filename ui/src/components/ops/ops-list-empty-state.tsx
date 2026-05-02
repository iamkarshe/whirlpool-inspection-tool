import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

type OpsListEmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  /** `default` — full list empty; `compact` — inside a card or subsection. */
  variant?: "default" | "compact";
  className?: string;
};

export function OpsListEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  variant = "default",
  className,
}: OpsListEmptyStateProps) {
  const compact = variant === "compact";
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center text-center",
        compact ? "max-w-none gap-2 py-3" : "max-w-[18rem] gap-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-border/50 bg-muted/25 text-muted-foreground shadow-sm ring-1 ring-border/30",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
        aria-hidden
      >
        <Icon
          className={cn("opacity-80", compact ? "h-5 w-5" : "h-7 w-7")}
          strokeWidth={1.5}
        />
      </div>
      <div className={cn("space-y-1", compact ? "space-y-0.5" : "space-y-1.5")}>
        <p
          className={cn(
            "font-medium tracking-tight text-foreground/90",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "leading-relaxed text-muted-foreground",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
