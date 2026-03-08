import { NavMain } from "@/components/layout/sidebar/nav-main";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsTablet } from "@/hooks/use-mobile";
import { CalendarClock, Globe, Tag } from "lucide-react";
import { useEffect, useState } from "react";

const RELEASE_CODE = "v1.0.0";
const LAST_UPDATED = "2026-03-05";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isTablet = useIsTablet();
  const [clientIp, setClientIp] = useState<string | null>(null);

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, []);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet]);

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data: { ip: string }) => setClientIp(data.ip))
      .catch(() => setClientIp("—"));
  }, []);

  const lightLogo = <img src="/logo.svg" alt="Whirlpool" />;
  const darkLogo = <img src="/logo-dark.svg" alt="Whirlpool" />;
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const logo = isDark ? darkLogo : lightLogo;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0!">
                  <div className="flex items-center text-foreground font-semibold text-xl">
                    {logo}
                    <span className="-ml-4">Insights</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <NavMain />
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <div className="bg-muted mt-1.5 rounded-md border group-data-[collapsible=icon]:hidden transition-none">
          <div className="space-y-2.5 p-3">
            <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              System
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <Tag className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground">Release</span>
              <span className="font-mono font-medium text-foreground">
                {RELEASE_CODE}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CalendarClock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground">Last updated</span>
              <span className="font-mono text-foreground">{LAST_UPDATED}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Globe className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground">IP address</span>
              <span className="max-w-[100px] truncate font-mono text-foreground">
                {clientIp ?? "…"}
              </span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
