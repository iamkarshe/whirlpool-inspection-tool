"use client";

import { useIsTablet } from "@/hooks/use-mobile";
import { PlusIcon } from "@radix-ui/react-icons";
import { ChevronsUpDown, ShoppingBagIcon, UserCircle2Icon } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";

import Logo from "@/components/layout/logo";
import { NavMain } from "@/components/layout/sidebar/nav-main";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Link } from "react-router-dom";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isTablet = useIsTablet();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, []);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0!">
                  <Logo />
                  <span className="text-foreground font-semibold">
                    Shadcn UI Kit
                  </span>
                  <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="mt-4 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md border">
                    <ShoppingBagIcon className="text-muted-foreground size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">E-commerce</span>
                    <span className="text-xs text-green-700">Active</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md border">
                    <UserCircle2Icon className="text-muted-foreground size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Blog Platform</span>
                    <span className="text-muted-foreground text-xs">
                      Inactive
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <Button size="sm" className="w-full">
                  <PlusIcon />
                  New Project
                </Button>
              </DropdownMenuContent>
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
        <Card className="gap-4 overflow-hidden py-4 group-data-[collapsible=icon]:hidden">
          <CardHeader className="px-3">
            <CardTitle>Unlock Everything</CardTitle>
            <CardDescription>
              Get instant access to all premium dashboards, templates, and UI
              components. Pay once, use forever in unlimited projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3">
            <Button className="w-full" asChild>
              <Link to="https://shadcnuikit.com/pricing" target="_blank">
                <span className="size-2 shrink-0 rounded-full bg-green-500"></span>
                Get Full Access
              </Link>
            </Button>
          </CardContent>
        </Card>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
