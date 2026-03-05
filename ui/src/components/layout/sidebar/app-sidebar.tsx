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
import { useEffect } from "react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isTablet = useIsTablet();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, []);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet]);

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
          <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Release</h4>
              <div className="text-muted-foreground flex cursor-pointer items-center text-sm">
                <span>v1.0.0</span>
              </div>
            </div>
            <div className="text-muted-foreground flex items-center text-xs">
              Last updated: 2026-03-05
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
