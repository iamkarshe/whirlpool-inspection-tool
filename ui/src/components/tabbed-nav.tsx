import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

export type TabbedNavVariant = "underline" | "sidebar";

export type TabbedNavItem = {
  label: string;
  to: string;
  end?: boolean;
  icon?: LucideIcon;
};

const underlineNavClass = "flex flex-wrap gap-1 border-b border-border";
const underlineLinkBase =
  "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px";
const underlineLinkActive = "border-primary text-foreground";
const underlineLinkInactive =
  "border-transparent text-muted-foreground hover:text-foreground";

const sidebarNavClass = "flex flex-col gap-0.5";
const sidebarLinkBase =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const sidebarLinkActive = "bg-muted text-foreground";
const sidebarLinkInactive =
  "text-muted-foreground hover:bg-muted/60 hover:text-foreground";

export function TabbedNav({
  items,
  variant = "underline",
  className,
}: {
  items: readonly TabbedNavItem[];
  variant?: TabbedNavVariant;
  className?: string;
}) {
  const navClass = variant === "sidebar" ? sidebarNavClass : underlineNavClass;

  return (
    <nav className={cn(navClass, className)}>
      {items.map(({ to, label, end = false, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              variant === "sidebar" ? sidebarLinkBase : underlineLinkBase,
              isActive
                ? variant === "sidebar"
                  ? sidebarLinkActive
                  : underlineLinkActive
                : variant === "sidebar"
                  ? sidebarLinkInactive
                  : underlineLinkInactive,
            )
          }
        >
          {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export type TabbedButtonItem<T extends string> = {
  label: string;
  value: T;
};

export function TabbedButtons<T extends string>({
  value,
  onValueChange,
  items,
  className,
}: {
  value: T;
  onValueChange: (next: T) => void;
  items: readonly TabbedButtonItem<T>[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn(underlineNavClass, className)}>
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(item.value)}
            className={cn(
              underlineLinkBase,
              isActive ? underlineLinkActive : underlineLinkInactive,
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
