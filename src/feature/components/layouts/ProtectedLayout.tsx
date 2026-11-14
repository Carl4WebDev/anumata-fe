import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import NotificationBell from "../../../shared/components/NotificationBell";
import OfflineBanner from "../../../shared/components/OfflineBanner";
import AiWakeBanner from "../../../shared/components/AiWakeBanner";
import LicenseBanner from "../../../shared/components/LicenseBanner";
import { storedRole } from "../../context/users/homePath";

export default function ProtectedLayout() {
  const token = localStorage.getItem("user_token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // The admin has no patients or interviews — only the admin page.
  if (storedRole() === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#F1F5F9]">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 pt-16 md:p-8 md:pt-6">
        {/* Notifications: top-right across from the menu button on phones; own row on desktop */}
        <div className="fixed right-4 top-4 z-40 md:static md:mb-3 md:flex md:justify-end">
          <NotificationBell />
        </div>
        <OfflineBanner />
        <AiWakeBanner />
        <LicenseBanner />
        <Outlet />
      </main>
    </div>
  );
}
