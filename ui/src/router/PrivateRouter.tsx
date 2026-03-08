import { Toaster } from "@/components/ui/sonner";
import DashboardLayout from "@/pages/dashboard/layout";
import { Navigate } from "react-router-dom";

export default function PrivateRouter() {
  const isAuthed = true; // replace with your auth state

  if (!isAuthed) return <Navigate to="/login" replace />;

  return (
    <>
      <DashboardLayout />
      <Toaster />
    </>
  );
}
