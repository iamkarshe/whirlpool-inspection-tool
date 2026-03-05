import { PageLoader } from "@/components/layout/page-loader";
import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

// Routers
const PublicRouter = lazy(() =>
  import("@/router/PublicRouter").then((m) => ({ default: m.PublicRouter })),
);
const PrivateRouter = lazy(() =>
  import("@/router/PrivateRouter").then((m) => ({ default: m.PrivateRouter })),
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
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <AnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: "admin/users",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UsersPage />
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
