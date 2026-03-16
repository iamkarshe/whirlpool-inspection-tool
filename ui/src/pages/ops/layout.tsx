import React from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CircleUserRound, Home, LineChart, ScanLine, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";

type OpsLayoutProps = {
  className?: string;
};

type TabConfig = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TABS: TabConfig[] = [
  { label: "Home", path: "/ops", icon: Home },
  { label: "New", path: "/ops/new-inspection", icon: ScanLine },
  { label: "Data", path: "/ops/data", icon: LineChart },
  { label: "Settings", path: "/ops/settings", icon: Settings2 },
];

export default function OpsLayout({ className }: OpsLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = React.useMemo(
    () =>
      TABS.reduce<TabConfig | undefined>((current, tab) => {
        if (!location.pathname.startsWith(tab.path)) return current;
        if (!current) return tab;
        return tab.path.length > current.path.length ? tab : current;
      }, undefined),
    [location.pathname],
  );

  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      <header className="sticky top-0 z-20 border-b bg-background/80 px-4 pb-2 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Whirlpool Ops
            </p>
            <p className="text-base font-semibold tracking-tight transition-all">
              {activeTab?.label ?? "Home"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/ops/account")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Account"
          >
            <CircleUserRound className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 pb-20 pt-3">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/80 pb-safe pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === "/ops"}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-[11px] font-medium text-muted-foreground transition-all",
                  isActive && "bg-accent text-accent-foreground shadow-sm translate-y-[-2px]",
                )
              }
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

