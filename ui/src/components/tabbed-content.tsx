import { cn } from "@/lib/utils";
import { TabbedNav, type TabbedNavItem } from "@/components/tabbed-nav";
import type { ReactNode } from "react";

export function TabbedSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "my-3 space-y-4 rounded-lg border bg-background px-4 py-2 pb-6 text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabbedContent({
  tabs,
  children,
  className,
}: {
  tabs: readonly TabbedNavItem[];
  children: ReactNode;
  className?: string;
}) {
  if (tabs.length === 0) {
    return <>{children}</>;
  }

  return (
    <TabbedSurface className={className}>
      <TabbedNav items={tabs} />
      {children}
    </TabbedSurface>
  );
}
