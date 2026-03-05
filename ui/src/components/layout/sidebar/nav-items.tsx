"use client";

import {
  ChartBarDecreasingIcon,
  ClipboardCheckIcon,
  FolderIcon,
  GaugeIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { PAGES } from "@/endpoints";

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
        href: PAGES.DASHBOARD,
        icon: GaugeIcon,
      },
      {
        title: "Masters",
        href: PAGES.DASHBOARD_MASTERS,
        icon: FolderIcon,
        items: [
          {
            title: "Product Categories",
            href: PAGES.DASHBOARD_MASTERS,
          },
          { title: "Products", href: PAGES.DASHBOARD_MASTERS },
          { title: "Warehouses", href: PAGES.DASHBOARD_MASTERS },
        ],
      },
      {
        title: "Transactions",
        href: "#",
        icon: ClipboardCheckIcon,
        items: [
          {
            title: "Inspections",
            href: PAGES.DASHBOARD_TRANSACTIONS_INSPECTIONS,
          },
          {
            title: "Checklists",
            href: PAGES.DASHBOARD_TRANSACTIONS_CHECKLISTS,
          },
          {
            title: "Reports",
            href: PAGES.DASHBOARD_TRANSACTIONS_REPORTS,
          },
        ],
      },
      {
        title: "Reports",
        href: "#",
        icon: ChartBarDecreasingIcon,
        items: [
          {
            title: "Daily Inspections",
            href: PAGES.DASHBOARD_REPORTS_DAILY_INSPECTIONS,
          },
          {
            title: "Daily Logins",
            href: PAGES.DASHBOARD_REPORTS_DAILY_LOGINS,
          },
        ],
      },
      {
        title: "Administration",
        href: "#",
        icon: SettingsIcon,
        items: [
          { title: "Users", href: PAGES.DASHBOARD_ADMIN_USERS },
          { title: "Devices", href: PAGES.DASHBOARD_ADMIN_DEVICES },
          { title: "Logins", href: PAGES.DASHBOARD_ADMIN_LOGINS },
          {
            title: "Integrations",
            href: PAGES.DASHBOARD_ADMIN_INTEGRATIONS,
          },
          { title: "Logs", href: PAGES.DASHBOARD_ADMIN_LOGS },
        ],
      },
    ],
  },
];
