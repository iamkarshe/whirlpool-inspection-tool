import { Navigate } from "react-router-dom";
import DashboardLayout from "@/pages/dashboard/layout";

export default function PrivateRouter() {
  const isAuthed = true; // replace with your auth state

  if (!isAuthed) return <Navigate to="/login" replace />;

  return <DashboardLayout />;
}
