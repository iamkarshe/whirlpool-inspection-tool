import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type OpsListHintProps = {
  /** When false, nothing is rendered (e.g. loading or no rows yet). */
  show: boolean;
  children: ReactNode;
  className?: string;
};

/** Muted one-line hint above a list; hide when the list is empty or still loading. */
export function OpsListHint({ show, children, className }: OpsListHintProps) {
  if (!show) return null;
  return (
    <header className={cn("space-y-1", className)}>
      <p className="text-sm text-muted-foreground">{children}</p>
    </header>
  );
}
