import { BrandLogo } from "@/components/brand-logo";
import { useSessionUser } from "@/hooks/use-session-user";
import { userInitialsFromName } from "@/lib/ops-user-display";
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
import { isOpsManagerRole } from "@/lib/ops-role";
import { cn } from "@/lib/utils";
import { Home, LineChart, ScanLine, Settings2, Users } from "lucide-react";
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
  { label: "Settings", path: "/ops/settings", icon: Settings2 },
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
    if (!isOpsManagerRole(sessionUser?.role)) return DEFAULT_TABS;
    const [home, ...rest] = DEFAULT_TABS;
    return [
      home!,
      { label: "Team", path: "/ops/team", icon: Users },
      ...rest,
    ];
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
  }, [
    currentTitle,
    activeTab?.label,
    location.pathname,
    location.search,
  ]);

  useEffect(() => {
    if (effectiveTitle) {
      setPageTitle(effectiveTitle);
    }
  }, [effectiveTitle]);

  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      <header className="sticky top-0 z-20 border-b bg-background/80 px-4 pb-2 pt-3 backdrop-blur_">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="space-y-0.5">
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
