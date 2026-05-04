import { AppNotificationsProvider } from "@/contexts/app-notifications-provider";
import { DashboardModuleWipDialog } from "@/components/dashboard/dashboard-module-wip-dialog";
import { SiteHeader } from "@/components/layout/header";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PAGES } from "@/endpoints";
import { setPageTitle } from "@/lib/core";
import React, { useEffect, useMemo } from "react";
import { Outlet, useLocation, useMatches } from "react-router-dom";

type RouteHandle = { title?: string };

export default function DashboardLayout() {
  const defaultOpen = true;
  const location = useLocation();

  const matches = useMatches();

  const isDashboardHome = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    return path === PAGES.DASHBOARD;
  }, [location.pathname]);

  const title = useMemo(() => {
    const match = [...matches]
      .reverse()
      .find((m) => (m.handle as RouteHandle)?.title);
    return ((match?.handle as RouteHandle)?.title ?? "").toString();
  }, [matches]);

  useEffect(() => {
    if (title) setPageTitle(title);
  }, [title]);

  return (
    <AppNotificationsProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 64)",
            "--header-height": "calc(var(--spacing) * 14)",
            "--content-padding": "calc(var(--spacing) * 4)",
            "--content-margin": "calc(var(--spacing) * 1.5)",
            "--content-full-height":
              "calc(100vh - var(--header-height) - (var(--content-padding) * 2) - (var(--content-margin) * 2))",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="bg-muted/40 flex flex-1 flex-col">
            <div
              data-containerid="dashboard-layout"
              data-testid="layout-dashboard"
              className="@container/main p-(--content-padding) xl:group-data-[theme-content-layout=centered]/layout:container xl:group-data-[theme-content-layout=centered]/layout:mx-auto"
            >
              {isDashboardHome ? (
                <DashboardModuleWipDialog moduleName="Dashboard" />
              ) : null}
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AppNotificationsProvider>
  );
}
