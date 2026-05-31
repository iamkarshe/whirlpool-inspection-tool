import { PAGES } from "@/endpoints";
import {
  APP_ROLE,
  DASHBOARD_APP_ROLES,
  SUPERADMIN_APP_ROLES,
  hasAnyAppRole,
  normalizeAppRole,
  type AppRoleSlug,
} from "@/lib/app-roles";
import {
  ChartBarDecreasingIcon,
  ClipboardCheckIcon,
  FolderIcon,
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
  /** When set, only these dashboard roles see the item. */
  roles?: readonly AppRoleSlug[];
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
        title: "Executive Analytics",
        href: PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS,
        icon: ChartBarDecreasingIcon,
        roles: DASHBOARD_APP_ROLES,
      },
      {
        title: "Masters",
        href: PAGES.DASHBOARD_MASTERS_PRODUCT_CATEGORIES,
        icon: FolderIcon,
        roles: DASHBOARD_APP_ROLES,
        items: [
          {
            title: "Product Categories",
            href: PAGES.DASHBOARD_MASTERS_PRODUCT_CATEGORIES,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Products",
            href: PAGES.DASHBOARD_MASTERS_PRODUCTS,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Plants",
            href: PAGES.DASHBOARD_MASTERS_PLANTS,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Warehouses",
            href: PAGES.DASHBOARD_MASTERS_WAREHOUSES,
            roles: DASHBOARD_APP_ROLES,
          },
        ],
      },
      {
        title: "Inspections",
        href: "#",
        icon: ClipboardCheckIcon,
        roles: DASHBOARD_APP_ROLES,
        items: [
          {
            title: "Overall",
            href: PAGES.DASHBOARD_INSPECTIONS,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Inbound",
            href: PAGES.DASHBOARD_INSPECTIONS_INBOUND,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "In-review Inbound",
            href: PAGES.DASHBOARD_INSPECTIONS_INBOUND_IN_REVIEW,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Rejected Inbound",
            href: PAGES.DASHBOARD_INSPECTIONS_INBOUND_REJECTED,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Approved Inbound",
            href: PAGES.DASHBOARD_INSPECTIONS_INBOUND_APPROVED,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Outbound",
            href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "In-review Outbound",
            href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND_IN_REVIEW,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Rejected Outbound",
            href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND_REJECTED,
            roles: DASHBOARD_APP_ROLES,
          },
          {
            title: "Approved Outbound",
            href: PAGES.DASHBOARD_INSPECTIONS_OUTBOUND_APPROVED,
            roles: DASHBOARD_APP_ROLES,
          },
        ],
      },
      {
        title: "Administration",
        href: "#",
        icon: SettingsIcon,
        roles: SUPERADMIN_APP_ROLES,
        items: [
          {
            title: "Users",
            href: PAGES.DASHBOARD_ADMIN_USERS,
            roles: SUPERADMIN_APP_ROLES,
          },
          {
            title: "VPN Peers",
            href: PAGES.DASHBOARD_ADMIN_VPN,
            roles: SUPERADMIN_APP_ROLES,
          },
          {
            title: "Devices",
            href: PAGES.DASHBOARD_ADMIN_DEVICES,
            roles: SUPERADMIN_APP_ROLES,
          },
          {
            title: "Logins",
            href: PAGES.DASHBOARD_ADMIN_LOGINS,
            roles: SUPERADMIN_APP_ROLES,
          },
          {
            title: "Integrations",
            href: PAGES.integrationsOktaPath(),
            roles: SUPERADMIN_APP_ROLES,
          },
          {
            title: "Logs",
            href: PAGES.DASHBOARD_ADMIN_LOGS,
            roles: SUPERADMIN_APP_ROLES,
          },
          {
            title: "Job Logs",
            href: PAGES.DASHBOARD_ADMIN_JOB_LOGS,
            roles: SUPERADMIN_APP_ROLES,
          },
          {
            title: "Knowledge Base",
            href: PAGES.DASHBOARD_ADMIN_KNOWLEDGE_BASE,
            roles: SUPERADMIN_APP_ROLES,
          },
        ],
      },
    ],
  },
];

function filterNavItem(item: NavItem, role: string | null | undefined): NavItem | null {
  const allowed = item.roles ?? DASHBOARD_APP_ROLES;
  if (!hasAnyAppRole(role, allowed)) return null;

  if (!item.items?.length) return item;

  const subItems = item.items
    .map((sub) => filterNavItem(sub, role))
    .filter((sub): sub is NavItem => sub !== null);

  if (subItems.length === 0) return null;

  return { ...item, items: subItems };
}

/** Sidebar / command palette entries visible for the signed-in dashboard role. */
export function getNavItemsForRole(
  role: string | null | undefined,
): NavGroup[] {
  const normalized = normalizeAppRole(role);
  if (!normalized || normalized === APP_ROLE.operator || normalized === APP_ROLE.manager) {
    return [];
  }

  return navItems
    .map((group) => {
      const items = group.items
        .map((item) => filterNavItem(item, role))
        .filter((item): item is NavItem => item !== null);
      if (items.length === 0) return null;
      return { ...group, items };
    })
    .filter((group): group is NavGroup => group !== null);
}
