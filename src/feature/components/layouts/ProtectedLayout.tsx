import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";

export default function ProtectedLayout() {
  const token = localStorage.getItem("user_token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#F1F5F9]">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 pt-16 md:p-8 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
