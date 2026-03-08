import { PAGES } from "@/endpoints";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CloudCog, KeyRound } from "lucide-react";

const services = [
  { title: "Okta SSO", href: PAGES.integrationsOktaPath(), icon: KeyRound },
  {
    title: "AWS S3 Bucket config",
    href: PAGES.integrationsAwsS3Path(),
    icon: CloudCog,
  },
] as const;

export default function IntegrationsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground text-sm">
          Configure external services and single sign-on.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="lg:w-56 shrink-0">
          <nav className="flex flex-col gap-0.5">
            {services.map(({ title, href, icon: Icon }) => (
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
