import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/i18n";
import GlobalSearch from "@/components/GlobalSearch";
import {
  LayoutDashboard, Users as UsersIcon, UserPlus, CalendarDays, Stethoscope, HeartPulse,
  Wind, Bandage, FlaskConical, ScanLine, FileText, FileBarChart, Settings, ScrollText,
  Activity, LogOut, Globe,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABEL = {
  SUPER_ADMIN: "Süper Admin", CLINIC_ADMIN: "Klinik Admin", DOCTOR: "Doktor",
  NURSE: "Hemşire", SECRETARY: "Sekreter", PATIENT: "Hasta",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();

  const nav = [
    { to: "/", icon: LayoutDashboard, label: t("dashboard"), end: true },
    { to: "/patients", icon: UsersIcon, label: t("patients") },
    { to: "/patients/new", icon: UserPlus, label: t("new_patient") },
    { to: "/appointments", icon: CalendarDays, label: t("appointments") },
    { to: "/encounters", icon: Stethoscope, label: t("encounters") },
    { to: "/hbot-treatments", icon: HeartPulse, label: t("hbot_treatments") },
    { to: "/hbot-sessions", icon: Wind, label: t("hbot_sessions") },
    { to: "/wounds", icon: Bandage, label: t("wound_tracking") },
    { to: "/labs", icon: FlaskConical, label: t("laboratory") },
    { to: "/imaging", icon: ScanLine, label: t("imaging") },
    { to: "/documents", icon: FileText, label: t("documents") },
    { to: "/reports", icon: FileBarChart, label: t("reports") },
    { to: "/users", icon: UsersIcon, label: t("users"), roles: ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"] },
    { to: "/clinic-settings", icon: Settings, label: t("clinic_settings"), roles: ["SUPER_ADMIN", "CLINIC_ADMIN"] },
    { to: "/audit", icon: ScrollText, label: t("audit_log"), roles: ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"] },
  ];

  const visible = nav.filter((n) => !n.roles || n.roles.includes(user?.role));

  const doLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 z-30 hidden md:flex">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
          <span className="font-heading font-extrabold text-white text-lg">HBOT</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visible.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} data-testid={`nav-${n.to.replace(/\//g, "") || "home"}`}
              className={({ isActive }) =>
                `sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? "bg-teal-600 text-white" : "hover:bg-slate-800 hover:text-white"
                }`}>
              <n.icon className="w-[18px] h-[18px]" />{n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 md:ml-60 flex flex-col min-w-0">
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 flex items-center gap-4 px-4 sm:px-6">
          <GlobalSearch />
          <button data-testid="lang-toggle-header" onClick={() => setLang(lang === "tr" ? "en" : "tr")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-full px-3 py-1.5 hover:border-teal-500">
            <Globe className="w-3.5 h-3.5" /> {lang === "tr" ? "EN" : "TR"}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-semibold text-sm">
                  {(user?.name || "?").slice(0, 1)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-semibold leading-tight">{user?.name}</div>
                  <div className="text-xs text-slate-400">{ROLE_LABEL[user?.role] || user?.role}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="logout-btn" onClick={doLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" /> {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
