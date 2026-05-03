export const PAGES = {
  CHECK_APP: "/",
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  REGISTER: "/register",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",

  DASHBOARD: "/dashboard",
  DASHBOARD_MASTERS_PRODUCT_CATEGORIES: "/dashboard/masters/product-categories",
  DASHBOARD_MASTERS_PRODUCTS: "/dashboard/masters/products",
  DASHBOARD_MASTERS_PLANTS: "/dashboard/masters/plants",
  DASHBOARD_MASTERS_WAREHOUSES: "/dashboard/masters/warehouses",

  DASHBOARD_SETTINGS: "/dashboard/settings",
  settingsPasswordPath: () => `${PAGES.DASHBOARD_SETTINGS}/password`,
  settingsSessionsPath: () => `${PAGES.DASHBOARD_SETTINGS}/sessions`,
  DASHBOARD_NOTIFICATIONS: "/dashboard/notifications",
  DASHBOARD_RELEASE_NOTES: "/dashboard/release-notes",

  DASHBOARD_INSPECTIONS: "/dashboard/inspections",
  DASHBOARD_INSPECTIONS_INBOUND: "/dashboard/inspections/inbound",
  DASHBOARD_INSPECTIONS_INBOUND_FAILED: "/dashboard/inspections/inbound-failed",
  DASHBOARD_INSPECTIONS_INBOUND_IN_REVIEW:
    "/dashboard/inspections/inbound/in-review",
  DASHBOARD_INSPECTIONS_INBOUND_REJECTED:
    "/dashboard/inspections/inbound/rejected",
  DASHBOARD_INSPECTIONS_INBOUND_APPROVED:
    "/dashboard/inspections/inbound/approved",
  DASHBOARD_INSPECTIONS_OUTBOUND: "/dashboard/inspections/outbound",
  DASHBOARD_INSPECTIONS_OUTBOUND_FAILED: "/dashboard/inspections/outbound-failed",
  DASHBOARD_INSPECTIONS_OUTBOUND_IN_REVIEW:
    "/dashboard/inspections/outbound/in-review",
  DASHBOARD_INSPECTIONS_OUTBOUND_REJECTED:
    "/dashboard/inspections/outbound/rejected",
  DASHBOARD_INSPECTIONS_OUTBOUND_APPROVED:
    "/dashboard/inspections/outbound/approved",
  DASHBOARD_INSPECTIONS_FLAGGED: "/dashboard/inspections/flagged",
  DASHBOARD_INSPECTIONS_FLAGGED_IMAGES: "/dashboard/inspections/flagged-images",
  inspectionViewPath: (id: string) => `${PAGES.DASHBOARD_INSPECTIONS}/${id}`,
  DASHBOARD_TRANSACTIONS_CHECKLISTS: "/dashboard/transactions/checklists",
  DASHBOARD_TRANSACTIONS_REPORTS: "/dashboard/transactions/reports",
  DASHBOARD_TRANSACTIONS_INSPECTIONS: "/dashboard/inspections",
  DASHBOARD_REPORTS_DAILY_INSPECTIONS: "/dashboard/inspections",
  DASHBOARD_REPORTS_OPERATIONS_ANALYTICS: "/dashboard/reports/operations-analytics",
  DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS: "/dashboard/reports/executive-analytics",
  DASHBOARD_ADMIN_USERS: "/dashboard/admin/users",
  DASHBOARD_ADMIN_DEVICES: "/dashboard/admin/devices",

  productCategoryProductsPath: (categoryId: number) =>
    `${PAGES.DASHBOARD_MASTERS_PRODUCTS}?product_category_id=${categoryId}`,

  productCategoryViewPath: (categoryId: number | string) =>
    `${PAGES.DASHBOARD_MASTERS_PRODUCT_CATEGORIES}/${categoryId}`,

  productViewPath: (productId: number | string) =>
    `${PAGES.DASHBOARD_MASTERS_PRODUCTS}/${productId}`,

  userViewPath: (userUuid: string) => `/dashboard/admin/users/${userUuid}`,
  userViewDevicesPath: (userUuid: string) =>
    `/dashboard/admin/users/${userUuid}/devices`,
  userViewInspectionsPath: (userUuid: string) =>
    `/dashboard/admin/users/${userUuid}/inspections`,
  userViewLoginsPath: (userUuid: string) =>
    `/dashboard/admin/users/${userUuid}/logins`,
  userDevicesPath: (userUuid: string) =>
    `/dashboard/admin/devices?user_uuid=${encodeURIComponent(userUuid)}`,
  userInspectionsPath: (userUuid: string) =>
    `${PAGES.DASHBOARD_INSPECTIONS}?user_uuid=${encodeURIComponent(userUuid)}`,
  deviceViewPath: (id: string) => `/dashboard/admin/devices/${id}`,
  deviceInspectionsPath: (id: string) =>
    `/dashboard/admin/devices/${id}/inspections`,
  deviceLoginsPath: (id: string) =>
    `/dashboard/admin/devices/${id}/logins`,
  deviceLockHistoryPath: (id: string) =>
    `/dashboard/admin/devices/${id}/lock-history`,
  deviceUsersPath: (id: string) =>
    `/dashboard/admin/devices/${id}/users`,
  deviceNotificationsPath: (id: string) =>
    `/dashboard/admin/devices/${id}/notifications`,

  warehouseViewPath: (id: string) => `/dashboard/masters/warehouses/${id}`,
  warehouseUsersPath: (id: string) =>
    `/dashboard/masters/warehouses/${id}/users`,
  warehouseDevicesPath: (id: string) =>
    `/dashboard/masters/warehouses/${id}/devices`,
  warehouseInspectionsPath: (id: string) =>
    `/dashboard/masters/warehouses/${id}/inspections`,
  plantViewPath: (id: string) => `/dashboard/masters/plants/${id}`,
  plantUsersPath: (id: string) => `/dashboard/masters/plants/${id}/users`,
  plantDevicesPath: (id: string) => `/dashboard/masters/plants/${id}/devices`,
  plantInspectionsPath: (id: string) =>
    `/dashboard/masters/plants/${id}/inspections`,

  productCategoryChecklistsPath: (categoryId: number) =>
    `${PAGES.DASHBOARD_TRANSACTIONS_CHECKLISTS}?product_category_id=${categoryId}`,

  DASHBOARD_ADMIN_LOGINS: "/dashboard/admin/logins",
  DASHBOARD_ADMIN_INTEGRATIONS: "/dashboard/admin/integrations",
  integrationsOktaPath: () =>
    `${PAGES.DASHBOARD_ADMIN_INTEGRATIONS}/okta`,
  integrationsAwsS3Path: () =>
    `${PAGES.DASHBOARD_ADMIN_INTEGRATIONS}/aws-s3`,
  DASHBOARD_ADMIN_LOGS: "/dashboard/admin/logs",
  logViewPath: (id: string) => `${PAGES.DASHBOARD_ADMIN_LOGS}/${id}`,
  DASHBOARD_ADMIN_KNOWLEDGE_BASE: "/dashboard/admin/knowledge-base",

  OPS_HOME: "/ops",
  OPS_NEW_INSPECTION: "/ops/new-inspection",
  OPS_NEW_INSPECTION_INBOUND: "/ops/new-inspection/inbound",
  OPS_NEW_INSPECTION_OUTBOUND: "/ops/new-inspection/outbound",
  opsNewInspectionUnitPath: (barcode: string) =>
    `${PAGES.OPS_NEW_INSPECTION}/unit/${encodeURIComponent(barcode)}`,
  OPS_DATA: "/ops/data",
  OPS_SEARCH: "/ops/search",
  OPS_SETTINGS: "/ops/settings",
  OPS_ACCOUNT: "/ops/account",
  OPS_HELP: "/ops/help",
  OPS_TODAY_INSPECTIONS: "/ops/today-inspections",
  OPS_INSPECTION_LIST: "/ops/inspection-list",
  OPS_TEAM: "/ops/team",
  OPS_TEAM_REVIEW: "/ops/team/review",
  OPS_INSPECTIONS: "/ops/inspections",
  opsInspectionDetailPath: (id: string) => `/ops/inspections/${id}`,
};
