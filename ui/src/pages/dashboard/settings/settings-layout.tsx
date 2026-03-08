import { PAGES } from "@/endpoints";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { KeyRound, LogOut } from "lucide-react";

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
          <nav className="flex flex-col gap-0.5">
            {items.map(({ title, href, icon: Icon }) => (
              <NavLink
                key={href}
                to={href}
                end={false}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {title}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
