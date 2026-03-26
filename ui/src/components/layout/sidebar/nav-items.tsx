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
          {
            title: "Checklists",
            href: PAGES.DASHBOARD_TRANSACTIONS_CHECKLISTS,
          },
        ],
      },
      {
        title: "Inspections",
        href: "#",
        icon: ClipboardCheckIcon,
        items: [
          {
            title: "Overall",
            href: PAGES.DASHBOARD_INSPECTIONS,
          },
          {
            title: "Inbound",
            href: PAGES.DASHBOARD_INSPECTIONS_INBOUND,
          },
          {
            title: "Inbound Failed",
            href: PAGES.DASHBOARD_INSPECTIONS_INBOUND_FAILED,
          },
          {
            title: "Outbound",
            href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND,
          },
          {
            title: "Outbound Failed",
            href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND_FAILED,
          },
          {
            title: "Flagged Inspections",
            href: PAGES.DASHBOARD_INSPECTIONS_FLAGGED,
          },
          {
            title: "Flagged Images",
            href: PAGES.DASHBOARD_INSPECTIONS_FLAGGED_IMAGES,
          },
        ],
      },
      {
        title: "Analytics",
        href: "#",
        icon: ChartBarDecreasingIcon,
        items: [
          {
            title: "Operations Analytics",
            href: PAGES.DASHBOARD_REPORTS_OPERATIONS_ANALYTICS,
          },
          {
            title: "Executive Analytics",
            href: PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS,
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
          {
            title: "Knowledge Base",
            href: PAGES.DASHBOARD_ADMIN_KNOWLEDGE_BASE,
          },
        ],
      },
    ],
  },
];
