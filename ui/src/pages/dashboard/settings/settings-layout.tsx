import { PAGES } from "@/endpoints";
import { Outlet } from "react-router-dom";
import { KeyRound, LogOut } from "lucide-react";
import { TabbedNav } from "@/components/tabbed-nav";

const items = [
  { title: "Update password", href: PAGES.settingsPasswordPath(), icon: KeyRound },
  { title: "Logout sessions", href: PAGES.settingsSessionsPath(), icon: LogOut },
] as const;

export default function SettingsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account security and active sessions.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="lg:w-56 shrink-0">
          <TabbedNav
            variant="sidebar"
            items={items.map(({ title, href, icon }) => ({
              label: title,
              to: href,
              icon,
            }))}
          />
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
