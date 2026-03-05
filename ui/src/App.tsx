import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { PublicRouter } from "./router/PublicRouter";
import { PrivateRouter } from "./router/PrivateRouter";
import LoginPage from "@/pages/auth/login";
import ForgotPasswordPage from "./pages/auth/forgot-password";
import ResetPasswordConfirmationPage from "./pages/auth/reset-password";
import AnalyticsPage from "./pages/dashboard/analytics/page";
import ErrorBoundary from "./pages/error-boundary";
import NotFoundPage from "./pages/not-found";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicRouter />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordConfirmationPage />,
      },
    ],
  },
  {
    path: "/dashboard",
    element: <PrivateRouter />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <AnalyticsPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
