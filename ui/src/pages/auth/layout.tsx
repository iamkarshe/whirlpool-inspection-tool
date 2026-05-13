import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { setPageTitle } from "@/lib/core";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  const buildVersion = import.meta.env.VITE_APP_BUILD?.trim() || "dev";

  useEffect(() => {
    setPageTitle(title);
  }, [title]);

  const hardReload = () => {
    if (typeof window === "undefined") return;
    window.localStorage.clear();
    window.sessionStorage.clear();
    void window.caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
      .finally(() => window.location.reload());
  };

  return (
    <>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-[2%] py-4 lg:h-screen sm:px-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.22),transparent_45%),radial-gradient(ellipse_at_bottom,_rgba(167,139,250,0.18),transparent_50%)] blur-2xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/35 via-transparent to-background" />
        <div className="relative w-[98%]">{children}</div>
        <button
          type="button"
          onClick={hardReload}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-center font-mono text-[11px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 uppercase"
          title="Reload app and fetch the latest build"
        >
          Version {buildVersion}
        </button>
      </div>

      <Toaster />
    </>
  );
}
