import { Suspense, lazy } from "react";
import { PageLoader } from "@/components/layout/page-loader";
import { createBrowserRouter } from "react-router-dom";

// Components
import EmptyComponent from "@/components/empty4";

// Routers
import PrivateRouter from "@/router/PrivateRouter";
import { OpsRouter } from "@/router/OpsRouter";
const PublicRouter = lazy(() =>
  import("@/router/PublicRouter").then((m) => ({ default: m.PublicRouter })),
);

// Auth Pages
const LoginPage = lazy(() => import("@/pages/auth/login"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPasswordConfirmationPage = lazy(
  () => import("@/pages/auth/reset-password"),
);
// Auth Pages ENDS

// Root splash / connection check
const CheckAppPage = lazy(
  () => import("@/pages/check-app/page"),
);

// Dashboard Pages
const AnalyticsPage = lazy(() => import("@/pages/dashboard/analytics/page"));
const UsersPage = lazy(() => import("@/pages/dashboard/admin/users/page"));
const UserViewLayout = lazy(
  () => import("@/pages/dashboard/admin/users/user-view/user-view-layout"),
);
const UserViewDetailsPage = lazy(
  () => import("@/pages/dashboard/admin/users/user-view/details-page"),
);
const UserViewDevicesPage = lazy(
  () => import("@/pages/dashboard/admin/users/user-view/devices-page"),
);
const UserViewInspectionsPage = lazy(
  () => import("@/pages/dashboard/admin/users/user-view/inspections-page"),
);
const UserViewLoginsPage = lazy(
  () => import("@/pages/dashboard/admin/users/user-view/logins-page"),
);
const DevicesPage = lazy(() => import("@/pages/dashboard/admin/devices/page"));
const DeviceViewLayout = lazy(
  () =>
    import("@/pages/dashboard/admin/devices/device-view/device-view-layout"),
);
const DeviceViewDetailsPage = lazy(
  () => import("@/pages/dashboard/admin/devices/device-view/details-page"),
);
const DeviceViewInspectionsPage = lazy(
  () => import("@/pages/dashboard/admin/devices/device-view/inspections-page"),
);
const DeviceViewLoginsPage = lazy(
  () => import("@/pages/dashboard/admin/devices/device-view/logins-page"),
);
const DeviceViewLockHistoryPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/devices/device-view/lock-history-page"
    ),
);
const DeviceViewNotificationsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/devices/device-view/device-notifications-page"
    ),
);
const DeviceViewUsersPage = lazy(
  () => import("@/pages/dashboard/admin/devices/device-view/users-page"),
);
const ProductCategoriesPage = lazy(
  () => import("@/pages/dashboard/admin/product-categories/page"),
);
const ProductCategoryViewLayout = lazy(
  () => import("@/pages/dashboard/admin/product-categories/category-view/page"),
);
const ProductCategoryOverviewPage = lazy(
  () => import("@/pages/dashboard/admin/product-categories/category-view/overview-page"),
);
const ProductCategoryProductsPage = lazy(
  () => import("@/pages/dashboard/admin/product-categories/category-view/products-page"),
);
const ProductCategoryInspectionsPage = lazy(
  () => import("@/pages/dashboard/admin/product-categories/category-view/inspections-page"),
);
const ProductCategoryInboundInspectionsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/product-categories/category-view/inbound-inspections-page"
    ),
);
const ProductCategoryOutboundInspectionsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/product-categories/category-view/outbound-inspections-page"
    ),
);
const ProductCategoryInboundFailedInspectionsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/product-categories/category-view/inbound-failed-inspections-page"
    ),
);
const ProductCategoryOutboundFailedInspectionsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/product-categories/category-view/outbound-failed-inspections-page"
    ),
);
const ProductsPage = lazy(
  () => import("@/pages/dashboard/admin/products/page"),
);
const ProductViewLayout = lazy(
  () => import("@/pages/dashboard/admin/products/product-view/page"),
);
const ProductOverviewPage = lazy(
  () => import("@/pages/dashboard/admin/products/product-view/overview-page"),
);
const ProductInspectionsPage = lazy(
  () => import("@/pages/dashboard/admin/products/product-view/inspections-page"),
);
const ProductInboundInspectionsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/products/product-view/inbound-inspections-page"
    ),
);
const ProductOutboundInspectionsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/products/product-view/outbound-inspections-page"
    ),
);
const ProductInboundFailedInspectionsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/products/product-view/inbound-failed-inspections-page"
    ),
);
const ProductOutboundFailedInspectionsPage = lazy(
  () =>
    import(
      "@/pages/dashboard/admin/products/product-view/outbound-failed-inspections-page"
    ),
);
const WarehousesPage = lazy(
  () => import("@/pages/dashboard/admin/warehouses/page"),
);
const WarehouseViewLayout = lazy(
  () =>
    import("@/pages/dashboard/admin/warehouses/warehouse-view/warehouse-view-layout"),
);
const WarehouseViewDetailsPage = lazy(
  () =>
    import("@/pages/dashboard/admin/warehouses/warehouse-view/details-page"),
);
const WarehouseViewUsersPage = lazy(
  () => import("@/pages/dashboard/admin/warehouses/warehouse-view/users-page"),
);
const WarehouseViewDevicesPage = lazy(
  () =>
    import("@/pages/dashboard/admin/warehouses/warehouse-view/devices-page"),
);
const WarehouseViewInspectionsPage = lazy(
  () =>
    import("@/pages/dashboard/admin/warehouses/warehouse-view/inspections-page"),
);
const SettingsLayout = lazy(
  () => import("@/pages/dashboard/settings/settings-layout"),
);
const SettingsPasswordPage = lazy(
  () => import("@/pages/dashboard/settings/password/page"),
);
const SettingsSessionsPage = lazy(
  () => import("@/pages/dashboard/settings/sessions/page"),
);
const NotificationsPage = lazy(
  () => import("@/pages/dashboard/notifications/page"),
);
const ReleaseNotesPage = lazy(
  () => import("@/pages/dashboard/release-notes/page"),
);
const OperationsAnalyticsPage = lazy(
  () =>
    import("@/pages/dashboard/reports/operations-analytics/page"),
);
const ExecutiveAnalyticsPage = lazy(
  () =>
    import("@/pages/dashboard/reports/executive-analytics/page"),
);
const InspectionsPage = lazy(
  () => import("@/pages/dashboard/inspections/page"),
);
const InboundInspectionsPage = lazy(
  () => import("@/pages/dashboard/inspections/inbound/page"),
);
const InboundFailedInspectionsPage = lazy(
  () => import("@/pages/dashboard/inspections/inbound-failed/page"),
);
const OutboundInspectionsPage = lazy(
  () => import("@/pages/dashboard/inspections/outbound/page"),
);
const OutboundFailedInspectionsPage = lazy(
  () => import("@/pages/dashboard/inspections/outbound-failed/page"),
);
const InspectionViewPage = lazy(
  () => import("@/pages/dashboard/inspections/inspection-view-page"),
);
const LoginsPage = lazy(() => import("@/pages/dashboard/admin/logins/page"));
const IntegrationsLayout = lazy(
  () => import("@/pages/dashboard/admin/integrations/integrations-layout"),
);
const IntegrationsOktaPage = lazy(
  () => import("@/pages/dashboard/admin/integrations/okta/page"),
);
const IntegrationsAwsS3Page = lazy(
  () => import("@/pages/dashboard/admin/integrations/aws-s3/page"),
);
const LogsPage = lazy(() => import("@/pages/dashboard/admin/log/page"));
const LogViewPage = lazy(
  () => import("@/pages/dashboard/admin/log/log-view-page"),
);
const KnowledgeBasePage = lazy(
  () => import("@/pages/dashboard/admin/knowledge-base/page"),
);
const OpsLayout = lazy(() => import("@/pages/ops/layout"));
const OpsHomePage = lazy(() => import("@/pages/ops/home/page"));
const OpsNewInspectionPage = lazy(
  () => import("@/pages/ops/new-inspection/page"),
);
const OpsDataPage = lazy(() => import("@/pages/ops/data/page"));
const OpsSearchPage = lazy(() => import("@/pages/ops/search/page"));
const OpsSettingsPage = lazy(() => import("@/pages/ops/settings/page"));
const OpsAccountPage = lazy(() => import("@/pages/ops/account/page"));
const OpsHelpPage = lazy(() => import("@/pages/ops/help/page"));
const OpsTodayInspectionsPage = lazy(
  () => import("@/pages/ops/today-inspections/page"),
);
const OpsInspectionDetailPage = lazy(
  () => import("@/pages/ops/inspection-detail/page"),
);
// Dashboard Pages ENDS

// Error Boundary
const ErrorBoundary = lazy(() => import("@/pages/error-boundary"));

// Not Found Page
const NotFoundPage = lazy(() => import("@/pages/not-found"));

// Routes
export const router = createBrowserRouter([
  {
    path: "/ops",
    element: (
      <Suspense fallback={<PageLoader />}>
        <OpsRouter />
      </Suspense>
    ),
    errorElement: (
      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary />
      </Suspense>
    ),
    handle: { title: "Warehouse Ops" },
    children: [
      {
        element: (
          <Suspense fallback={<PageLoader />}>
            <OpsLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            handle: { title: "Home", renderLogo: true },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsHomePage />
              </Suspense>
            ),
          },
          {
            path: "new-inspection",
            handle: { title: "New Inspection" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsNewInspectionPage />
              </Suspense>
            ),
          },
          {
            path: "data",
            handle: { title: "Data Analytics" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsDataPage />
              </Suspense>
            ),
          },
          {
            path: "search",
            handle: { title: "Search Inspections" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsSearchPage />
              </Suspense>
            ),
          },
          {
            path: "today-inspections",
            handle: { title: "Today’s Inspections" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsTodayInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/:id",
            handle: { title: "Inspection Detail" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsInspectionDetailPage />
              </Suspense>
            ),
          },
          {
            path: "settings",
            handle: { title: "Settings" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsSettingsPage />
              </Suspense>
            ),
          },
          {
            path: "account",
            handle: { title: "Account" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsAccountPage />
              </Suspense>
            ),
          },
          {
            path: "help",
            handle: { title: "Help" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <OpsHelpPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicRouter />
      </Suspense>
    ),
    errorElement: (
      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <CheckAppPage />
          </Suspense>
        ),
      },
      {
        path: "login",
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ForgotPasswordPage />
          </Suspense>
        ),
      },
      {
        path: "reset-password",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ResetPasswordConfirmationPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "/dashboard",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PrivateRouter />
      </Suspense>
    ),
    errorElement: (
      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary />
      </Suspense>
    ),
    handle: { title: "Dashboard" },
    children: [
      {
        index: true,
        handle: { title: "Analytics" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <AnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: "admin/users",
        handle: { title: "Users" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <UsersPage />
          </Suspense>
        ),
      },
      {
        path: "admin/users/:id",
        handle: { title: "User details" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserViewLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <UserViewDetailsPage />
              </Suspense>
            ),
          },
          {
            path: "devices",
            handle: { title: "User devices" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <UserViewDevicesPage />
              </Suspense>
            ),
          },
          {
            path: "inspections",
            handle: { title: "User inspections" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <UserViewInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "logins",
            handle: { title: "User login history" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <UserViewLoginsPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: "admin/devices",
        handle: { title: "Devices" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <DevicesPage />
          </Suspense>
        ),
      },
      {
        path: "admin/devices/:id",
        handle: { title: "Device details" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <DeviceViewLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <DeviceViewDetailsPage />
              </Suspense>
            ),
          },
          {
            path: "users",
            handle: { title: "Device users" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <DeviceViewUsersPage />
              </Suspense>
            ),
          },
          {
            path: "inspections",
            handle: { title: "Device inspections" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <DeviceViewInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "logins",
            handle: { title: "Device logins" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <DeviceViewLoginsPage />
              </Suspense>
            ),
          },
          {
            path: "lock-history",
            handle: { title: "Device lock/unlock history" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <DeviceViewLockHistoryPage />
              </Suspense>
            ),
          },
          {
            path: "notifications",
            handle: { title: "Device notifications" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <DeviceViewNotificationsPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: "admin/logins",
        handle: { title: "Login activity" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginsPage />
          </Suspense>
        ),
      },
      {
        path: "admin/integrations",
        handle: { title: "Integrations" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <IntegrationsLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <IntegrationsOktaPage />
              </Suspense>
            ),
          },
          {
            path: "okta",
            handle: { title: "Okta SSO" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <IntegrationsOktaPage />
              </Suspense>
            ),
          },
          {
            path: "aws-s3",
            handle: { title: "AWS S3" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <IntegrationsAwsS3Page />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: "admin/logs",
        handle: { title: "Logs" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <LogsPage />
          </Suspense>
        ),
      },
      {
        path: "admin/logs/:id",
        handle: { title: "Log details" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <LogViewPage />
          </Suspense>
        ),
      },
      {
        path: "admin/knowledge-base",
        handle: { title: "Knowledge Base" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <KnowledgeBasePage />
          </Suspense>
        ),
      },
      {
        path: "inspections",
        handle: { title: "Inspections" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <InspectionsPage />
          </Suspense>
        ),
      },
      {
        path: "inspections/inbound",
        handle: { title: "Inbound Inspections" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <InboundInspectionsPage />
          </Suspense>
        ),
      },
      {
        path: "inspections/inbound-failed",
        handle: { title: "Inbound Failed" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <InboundFailedInspectionsPage />
          </Suspense>
        ),
      },
      {
        path: "inspections/outbound",
        handle: { title: "Outbound Inspections" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <OutboundInspectionsPage />
          </Suspense>
        ),
      },
      {
        path: "inspections/outbound-failed",
        handle: { title: "Outbound Failed" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <OutboundFailedInspectionsPage />
          </Suspense>
        ),
      },
      {
        path: "inspections/:id",
        handle: { title: "Inspection details" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <InspectionViewPage />
          </Suspense>
        ),
      },
      {
        path: "reports/operations-analytics",
        handle: { title: "Operations Analytics" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <OperationsAnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: "reports/executive-analytics",
        handle: { title: "Executive Analytics" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <ExecutiveAnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: "masters/product-categories",
        handle: { title: "Product Categories" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductCategoriesPage />
          </Suspense>
        ),
      },
      {
        path: "masters/product-categories/:id",
        handle: { title: "Product category" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductCategoryViewLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductCategoryOverviewPage />
              </Suspense>
            ),
          },
          {
            path: "products",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductCategoryProductsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductCategoryInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/inbound",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductCategoryInboundInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/outbound",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductCategoryOutboundInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/inbound-failed",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductCategoryInboundFailedInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/outbound-failed",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductCategoryOutboundFailedInspectionsPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: "masters/products",
        handle: { title: "Products" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductsPage />
          </Suspense>
        ),
      },
      {
        path: "masters/products/:id",
        handle: { title: "Product" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductViewLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductOverviewPage />
              </Suspense>
            ),
          },
          {
            path: "inspections",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/inbound",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductInboundInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/outbound",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductOutboundInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/inbound-failed",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductInboundFailedInspectionsPage />
              </Suspense>
            ),
          },
          {
            path: "inspections/outbound-failed",
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProductOutboundFailedInspectionsPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: "masters/warehouses",
        handle: { title: "Warehouses" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <WarehousesPage />
          </Suspense>
        ),
      },
      {
        path: "masters/warehouses/:id",
        handle: { title: "Warehouse details" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <WarehouseViewLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <WarehouseViewDetailsPage />
              </Suspense>
            ),
          },
          {
            path: "users",
            handle: { title: "Warehouse users" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <WarehouseViewUsersPage />
              </Suspense>
            ),
          },
          {
            path: "devices",
            handle: { title: "Warehouse devices" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <WarehouseViewDevicesPage />
              </Suspense>
            ),
          },
          {
            path: "inspections",
            handle: { title: "Warehouse inspections" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <WarehouseViewInspectionsPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: "settings",
        handle: { title: "Settings" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <SettingsPasswordPage />
              </Suspense>
            ),
          },
          {
            path: "password",
            handle: { title: "Update password" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <SettingsPasswordPage />
              </Suspense>
            ),
          },
          {
            path: "sessions",
            handle: { title: "Logout sessions" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <SettingsSessionsPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: "notifications",
        handle: { title: "Notifications" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotificationsPage />
          </Suspense>
        ),
      },
      {
        path: "release-notes",
        handle: { title: "Release Notes" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReleaseNotesPage />
          </Suspense>
        ),
      },
      {
        path: "*",
        handle: { title: "Resource Not Found" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <EmptyComponent />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
