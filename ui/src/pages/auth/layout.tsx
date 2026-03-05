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
    <div className="flex items-center justify-center py-4 lg:h-screen">
      {children}
    </div>
  );
}
