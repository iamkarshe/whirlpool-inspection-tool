export const PAGES = {
  HOME: "/",
  LOGIN: "/",
  FORGOT_PASSWORD: "/forgot-password",
  REGISTER: "/register",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",

  DASHBOARD: "/dashboard",
  DASHBOARD_MASTERS_PRODUCT_CATEGORIES: "/dashboard/masters/product-categories",
  DASHBOARD_MASTERS_PRODUCTS: "/dashboard/masters/products",
  DASHBOARD_MASTERS_WAREHOUSES: "/dashboard/masters/warehouses",

  DASHBOARD_SETTINGS: "/dashboard/settings",
  DASHBOARD_NOTIFICATIONS: "/dashboard/notifications",
  DASHBOARD_RELEASE_NOTES: "/dashboard/release-notes",

  DASHBOARD_TRANSACTIONS_INSPECTIONS: "/dashboard/transactions/inspections",
  DASHBOARD_TRANSACTIONS_CHECKLISTS: "/dashboard/transactions/checklists",
  DASHBOARD_TRANSACTIONS_REPORTS: "/dashboard/transactions/reports",

  DASHBOARD_REPORTS_DAILY_INSPECTIONS: "/dashboard/reports/daily-inspections",
  DASHBOARD_REPORTS_DAILY_LOGINS: "/dashboard/reports/daily-logins",

  DASHBOARD_ADMIN_USERS: "/dashboard/admin/users",
  DASHBOARD_ADMIN_DEVICES: "/dashboard/admin/devices",

  deviceViewPath: (id: string) => `/dashboard/admin/devices/${id}`,
  deviceInspectionsPath: (id: string) =>
    `/dashboard/admin/devices/${id}/inspections`,

  DASHBOARD_ADMIN_LOGINS: "/dashboard/admin/logins",
  DASHBOARD_ADMIN_INTEGRATIONS: "/dashboard/admin/integrations",
  DASHBOARD_ADMIN_LOGS: "/dashboard/admin/logs",
};
