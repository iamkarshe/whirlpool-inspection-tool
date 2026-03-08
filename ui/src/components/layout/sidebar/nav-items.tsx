import { PAGES } from "@/endpoints";
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
    title: "Menu",
    items: [
      {
        title: "Dashboard",
        href: PAGES.DASHBOARD,
        icon: GaugeIcon,
      },
      {
        title: "Masters",
        href: PAGES.DASHBOARD_MASTERS_PRODUCT_CATEGORIES,
        icon: FolderIcon,
        items: [
          {
            title: "Product Categories",
            href: PAGES.DASHBOARD_MASTERS_PRODUCT_CATEGORIES,
          },
          { title: "Products", href: PAGES.DASHBOARD_MASTERS_PRODUCTS },
          { title: "Warehouses", href: PAGES.DASHBOARD_MASTERS_WAREHOUSES },
        ],
      },
      {
        title: "Transactions",
        href: "#",
        icon: ClipboardCheckIcon,
        items: [
          {
            title: "Inspections",
            href: PAGES.DASHBOARD_INSPECTIONS,
          },
          {
            title: "Checklists",
            href: PAGES.DASHBOARD_TRANSACTIONS_CHECKLISTS,
          },
        ],
      },
      {
        title: "Reports",
        href: "#",
        icon: ChartBarDecreasingIcon,
        items: [
          {
            title: "Operations Analytics",
            href: "#",
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
            href: PAGES.integrationsOktaPath(),
          },
          { title: "Logs", href: PAGES.DASHBOARD_ADMIN_LOGS },
        ],
      },
    ],
  },
];
