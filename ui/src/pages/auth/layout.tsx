import { Toaster } from "@/components/ui/sonner";
import { setPageTitle } from "@/lib/core";
import { useEffect } from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  useEffect(() => {
    setPageTitle(title);
  }, [title]);

  return (
    <>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-[2%] py-4 lg:h-screen sm:px-0">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.22),transparent_45%),radial-gradient(ellipse_at_bottom,_rgba(167,139,250,0.18),transparent_50%)] blur-2xl"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/35 via-transparent to-background"
        />
        <div className="relative">{children}</div>
      </div>
      <Toaster />
    </>
  );
}
