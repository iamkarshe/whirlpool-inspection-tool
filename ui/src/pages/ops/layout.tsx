import { BrandLogo } from "@/components/brand-logo";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  formatOpsRoleBadgeLabel,
  userInitialsFromName,
} from "@/lib/ops-user-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setPageTitle } from "@/lib/core";
import {
  opsInspectionListTitle,
  parseOpsInspectionListQuery,
} from "@/lib/ops-inspection-list-query";
import {
  canOpsRoleStartNewInspection,
  isOpsManagerRole,
  normalizeOpsRole,
} from "@/lib/ops-role";
import { cn } from "@/lib/utils";
import { CircleUser, Home, LineChart, ScanLine, Users } from "lucide-react";
import React, { useEffect } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useMatches,
  useNavigate,
} from "react-router-dom";

type OpsLayoutProps = {
  className?: string;
};

type TabConfig = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

type RouteHandle = {
  title?: string;
  renderLogo?: boolean;
};

const DEFAULT_TABS: TabConfig[] = [
  { label: "Home", path: "/ops", icon: Home },
  { label: "New", path: "/ops/new-inspection", icon: ScanLine },
  { label: "Data", path: "/ops/data", icon: LineChart },
  { label: "Account", path: "/ops/account", icon: CircleUser },
];

export default function OpsLayout({ className }: OpsLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const matches = useMatches();
  const sessionUser = useSessionUser();
  const [showDesktopWarning, setShowDesktopWarning] = React.useState(false);

  const headerInitials = sessionUser?.name?.trim()?.length
    ? userInitialsFromName(sessionUser.name)
    : "?";

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hasSeen = window.sessionStorage.getItem("ops-desktop-warning-seen");
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!hasSeen && isDesktop) {
      setShowDesktopWarning(true);
    }
  }, []);

  const handleDismissDesktopWarning = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("ops-desktop-warning-seen", "1");
    }
    setShowDesktopWarning(false);
  };

  const navTabs = React.useMemo(() => {
    const base = canOpsRoleStartNewInspection(sessionUser?.role)
      ? DEFAULT_TABS
      : DEFAULT_TABS.filter((t) => t.path !== "/ops/new-inspection");
    if (!isOpsManagerRole(sessionUser?.role)) return base;
    const [home, ...rest] = base;
    return [home!, { label: "Team", path: "/ops/team", icon: Users }, ...rest];
  }, [sessionUser?.role]);

  const activeTab = React.useMemo(
    () =>
      navTabs.reduce<TabConfig | undefined>((current, tab) => {
        if (!location.pathname.startsWith(tab.path)) return current;
        if (!current) return tab;
        return tab.path.length > current.path.length ? tab : current;
      }, undefined),
    [location.pathname, navTabs],
  );

  const shouldRenderLogo = React.useMemo(
    () =>
      matches.some(
        (match) =>
          (match.handle as RouteHandle | undefined)?.renderLogo === true,
      ),
    [matches],
  );

  const currentTitle = React.useMemo(() => {
    const match = [...matches]
      .reverse()
      .find((m) => (m.handle as RouteHandle | undefined)?.title);
    return ((match?.handle as RouteHandle | undefined)?.title ?? "").toString();
  }, [matches]);

  const roleBadgeClass = React.useMemo(() => {
    const r = normalizeOpsRole(sessionUser?.role);
    if (r === "manager") {
      return cn(
        "border-violet-400/40 bg-gradient-to-b from-violet-500/[0.14] to-violet-600/[0.06] text-violet-950 ring-1 ring-violet-500/15",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] dark:border-violet-400/30 dark:from-violet-400/18 dark:to-violet-950/35 dark:text-violet-50 dark:ring-violet-400/20",
      );
    }
    if (r === "operator") {
      return cn(
        "border-emerald-400/40 bg-gradient-to-b from-emerald-500/[0.14] to-emerald-600/[0.06] text-emerald-950 ring-1 ring-emerald-500/15",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] dark:border-emerald-400/30 dark:from-emerald-400/18 dark:to-emerald-950/35 dark:text-emerald-50 dark:ring-emerald-400/20",
      );
    }
    if (r === "superadmin") {
      return cn(
        "border-amber-400/45 bg-gradient-to-b from-amber-500/[0.16] to-amber-600/[0.07] text-amber-950 ring-1 ring-amber-500/20",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] dark:border-amber-400/35 dark:from-amber-400/20 dark:to-amber-950/40 dark:text-amber-50 dark:ring-amber-400/25",
      );
    }
    return cn(
      "border-border/60 bg-gradient-to-b from-muted/80 to-muted/40 text-foreground ring-1 ring-border/40",
      "dark:from-muted/50 dark:to-muted/25 dark:text-foreground",
    );
  }, [sessionUser?.role]);

  const effectiveTitle = React.useMemo(() => {
    const base = currentTitle || activeTab?.label || "Home";
    if (location.pathname.startsWith("/ops/inspection-list")) {
      const q = parseOpsInspectionListQuery(
        new URLSearchParams(location.search),
      );
      if (q) return opsInspectionListTitle(q);
      return "Inspections";
    }
    if (!location.pathname.startsWith("/ops/today-inspections")) {
      return base;
    }
    const params = new URLSearchParams(location.search);
    const range = params.get("range") ?? "today";
    switch (range) {
      case "yesterday":
        return "Yesterday’s inspections";
      case "week":
        return "This week’s inspections";
      case "month":
        return "This month’s inspections";
      case "inwards":
        return "Inwards inspections";
      case "outwards":
        return "Outwards inspections";
      case "faults-today":
        return "Today’s inspections with faults";
      case "faults-week":
        return "This week’s inspections with faults";
      case "custom":
        return "Custom range inspections";
      default:
        return "Today’s inspections";
    }
  }, [currentTitle, activeTab?.label, location.pathname, location.search]);

  useEffect(() => {
    if (effectiveTitle) {
      setPageTitle(effectiveTitle);
    }
  }, [effectiveTitle]);

  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      <header className="sticky top-0 z-20 border-b bg-background/80 px-4 pb-2 pt-3 backdrop-blur_">
        <div className="mx-auto flex max-w-md items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {import.meta.env.VITE_APP_TITLE}
            </p>
            {shouldRenderLogo && <BrandLogo />}
            {!shouldRenderLogo && (
              <p
                key={location.pathname}
                className="text-base font-semibold tracking-tight animate-in fade-in-0 slide-in-from-bottom-2"
              >
                {effectiveTitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sessionUser?.role?.trim() ? (
              <span
                className={cn(
                  "inline-flex max-w-[10.5rem] items-center truncate rounded-md border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] tabular-nums sm:max-w-[14rem]",
                  roleBadgeClass,
                )}
              >
                {formatOpsRoleBadgeLabel(sessionUser.role)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => navigate("/ops/account")}
              title={
                sessionUser?.name?.trim()?.length ? sessionUser.name : "Account"
              }
              className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border bg-primary/10 px-2 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary/15"
            >
              {headerInitials}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 pb-20 pt-3">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/80 pb-safe pt-2 backdrop-blur_">
        <div className="mx-auto flex max-w-md items-center justify-between px-4">
          {navTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === "/ops"}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-[11px] font-medium text-muted-foreground transition-all",
                  isActive &&
                    "bg-accent text-accent-foreground shadow-sm translate-y-[-2px]",
                )
              }
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <Dialog open={showDesktopWarning} onOpenChange={setShowDesktopWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Optimized for mobile</DialogTitle>
            <DialogDescription>
              The Ops experience is designed as a mobile app for warehouse
              operators. For the best experience, open this page on your phone
              or a small tablet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 justify-end">
            <Button type="button" onClick={handleDismissDesktopWarning}>
              Continue here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
