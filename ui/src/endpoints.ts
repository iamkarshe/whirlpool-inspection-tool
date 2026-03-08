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
  inspectionViewPath: (id: string) =>
    `/dashboard/transactions/inspections/${id}`,
  DASHBOARD_TRANSACTIONS_CHECKLISTS: "/dashboard/transactions/checklists",
  DASHBOARD_TRANSACTIONS_REPORTS: "/dashboard/transactions/reports",

  DASHBOARD_REPORTS_DAILY_INSPECTIONS: "/dashboard/reports/daily-inspections",
  DASHBOARD_REPORTS_DAILY_LOGINS: "/dashboard/reports/daily-logins",

  DASHBOARD_ADMIN_USERS: "/dashboard/admin/users",
  DASHBOARD_ADMIN_DEVICES: "/dashboard/admin/devices",

  userViewPath: (id: number) => `/dashboard/admin/users/${id}`,
  userViewDevicesPath: (userId: number) =>
    `/dashboard/admin/users/${userId}/devices`,
  userViewInspectionsPath: (userId: number) =>
    `/dashboard/admin/users/${userId}/inspections`,
  userViewLoginsPath: (userId: number) =>
    `/dashboard/admin/users/${userId}/logins`,
  /** Devices list filtered by user (query param). */
  userDevicesPath: (userId: number) =>
    `/dashboard/admin/devices?user_id=${userId}`,
  /** Inspections list filtered by user (query param). */
  userInspectionsPath: (userId: number) =>
    `/dashboard/transactions/inspections?user_id=${userId}`,
  deviceViewPath: (id: string) => `/dashboard/admin/devices/${id}`,
  deviceInspectionsPath: (id: string) =>
    `/dashboard/admin/devices/${id}/inspections`,

  warehouseViewPath: (id: string) => `/dashboard/masters/warehouses/${id}`,
  warehouseUsersPath: (id: string) =>
    `/dashboard/masters/warehouses/${id}/users`,
  warehouseDevicesPath: (id: string) =>
    `/dashboard/masters/warehouses/${id}/devices`,
  warehouseInspectionsPath: (id: string) =>
    `/dashboard/masters/warehouses/${id}/inspections`,

  DASHBOARD_ADMIN_LOGINS: "/dashboard/admin/logins",
  DASHBOARD_ADMIN_INTEGRATIONS: "/dashboard/admin/integrations",
  integrationsOktaPath: () =>
    `${PAGES.DASHBOARD_ADMIN_INTEGRATIONS}/okta`,
  integrationsAwsS3Path: () =>
    `${PAGES.DASHBOARD_ADMIN_INTEGRATIONS}/aws-s3`,
  DASHBOARD_ADMIN_LOGS: "/dashboard/admin/logs",
};
