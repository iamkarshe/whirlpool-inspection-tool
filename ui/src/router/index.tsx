import { PageLoader } from "@/components/layout/page-loader";
import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

// Components
import EmptyComponent from "@/components/empty4";

// Routers
import PrivateRouter from "@/router/PrivateRouter";
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

// Dashboard Pages
const AnalyticsPage = lazy(() => import("@/pages/dashboard/analytics/page"));
const UsersPage = lazy(() => import("@/pages/dashboard/admin/users/page"));
const DevicesPage = lazy(() => import("@/pages/dashboard/admin/devices/page"));
const DeviceViewLayout = lazy(
  () =>
    import("@/pages/dashboard/admin/devices/device-view/device-view-layout"),
);
const DeviceViewDetailsPage = lazy(
  () =>
    import("@/pages/dashboard/admin/devices/device-view/details-page"),
);
const DeviceViewInspectionsPage = lazy(
  () =>
    import("@/pages/dashboard/admin/devices/device-view/inspections-page"),
);
const ProductCategoriesPage = lazy(
  () => import("@/pages/dashboard/admin/product-categories/page"),
);
const ProductsPage = lazy(
  () => import("@/pages/dashboard/admin/products/page"),
);
const WarehousesPage = lazy(
  () => import("@/pages/dashboard/admin/warehouses/page"),
);
const SettingsPage = lazy(() => import("@/pages/dashboard/settings/page"));
const NotificationsPage = lazy(
  () => import("@/pages/dashboard/notifications/page"),
);
const ReleaseNotesPage = lazy(
  () => import("@/pages/dashboard/release-notes/page"),
);
// Dashboard Pages ENDS

// Error Boundary
const ErrorBoundary = lazy(() => import("@/pages/error-boundary"));

// Not Found Page
const NotFoundPage = lazy(() => import("@/pages/not-found"));

// Routes
export const router = createBrowserRouter([
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
            path: "inspections",
            handle: { title: "Device inspections" },
            element: (
              <Suspense fallback={<PageLoader />}>
                <DeviceViewInspectionsPage />
              </Suspense>
            ),
          },
        ],
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
        path: "masters/products",
        handle: { title: "Products" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductsPage />
          </Suspense>
        ),
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
        path: "settings",
        handle: { title: "Settings" },
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
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
