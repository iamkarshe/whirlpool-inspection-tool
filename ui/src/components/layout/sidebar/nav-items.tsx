"use client";

import {
  ChartBarDecreasingIcon,
  ClipboardCheckIcon,
  FolderIcon,
  GaugeIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  isComing?: boolean;
  isDataBadge?: string;
  isNew?: boolean;
  newTab?: boolean;
  items?: NavItem[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navItems: NavGroup[] = [
  {
    title: "Dashboards",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: GaugeIcon,
      },
      {
        title: "Masters",
        href: "/dashboard/project-management",
        icon: FolderIcon,
        items: [
          {
            title: "Product Categories",
            href: "/dashboard/project-management",
          },
          { title: "Products", href: "/dashboard/project-management" },
          { title: "Warehouses", href: "/dashboard/project-management" },
        ],
      },
      {
        title: "Transactions",
        href: "#",
        icon: ClipboardCheckIcon,
        items: [
          { title: "Inspections", href: "/dashboard/ecommerce" },
          { title: "Checklists", href: "/dashboard/pages/products" },
          { title: "Reports", href: "/dashboard/pages/products" },
        ],
      },
      {
        title: "Reports",
        href: "#",
        icon: ChartBarDecreasingIcon,
        items: [
          { title: "Daily Inspections", href: "/dashboard/ecommerce" },
          { title: "Daily Logins", href: "/dashboard/pages/products" },
        ],
      },
      {
        title: "Administration",
        href: "#",
        icon: SettingsIcon,
        items: [
          { title: "Users", href: "/dashboard/ecommerce" },
          { title: "Devices", href: "/dashboard/ecommerce" },
          { title: "Logins", href: "/dashboard/ecommerce" },
          { title: "Integrations", href: "/dashboard/pages/products" },
          { title: "Logs", href: "/dashboard/pages/products" },
        ],
      },
    ],
  },
];
