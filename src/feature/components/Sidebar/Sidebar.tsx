import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../context/users/useUser";
import { LayoutDashboard, Users, FileQuestion, Link2, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", path: "/patients", icon: Users },
  { label: "Question Sets", path: "/question-sets", icon: FileQuestion },
  { label: "Interview Links", path: "/interview-links", icon: Link2 },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar() {
  const { clearUser } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    clearUser();
    setIsOpen(false);
    navigate("/");
  };

  const handleNav = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger button — visible on small screens only */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed top-4 left-4 z-50 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm md:hidden"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 md:hidden ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-[#08132E] text-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-4" onClick={handleNav}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-xl font-bold">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold">Amumata</h1>
              <p className="text-sm text-slate-400">Therapist Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNav}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#1A3270] text-white"
                    : "text-slate-400 hover:bg-[#13244D] hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-[#13244D] hover:text-white"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
