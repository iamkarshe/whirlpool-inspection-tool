import { PAGES } from "@/endpoints";
import { Outlet } from "react-router-dom";
import { CloudCog, KeyRound } from "lucide-react";
import { TabbedNav } from "@/components/tabbed-nav";

const services = [
  { title: "Okta SSO", href: PAGES.integrationsOktaPath(), icon: KeyRound },
  {
    title: "AWS S3",
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
          <TabbedNav
            variant="sidebar"
            items={services.map(({ title, href, icon }) => ({
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
