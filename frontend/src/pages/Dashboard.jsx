import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { fmtDate } from "@/components/common";
import { Card } from "@/components/ui/card";
import {
  CalendarDays, Wind, HeartPulse, UserPlus, Bandage, AlertTriangle,
  FileWarning, FileX, Activity, Users as UsersIcon,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const KPIS = [
  { key: "appointments_today", label: "appts_today", icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50", to: "/appointments" },
  { key: "hbot_sessions_today", label: "sessions_today", icon: Wind, color: "text-teal-600", bg: "bg-teal-50", to: "/hbot-sessions" },
  { key: "active_hbot_patients", label: "active_hbot", icon: HeartPulse, color: "text-teal-700", bg: "bg-teal-50", to: "/hbot-treatments" },
  { key: "new_patients_week", label: "new_patients", icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50", to: "/patients" },
  { key: "active_wound_patients", label: "active_wounds", icon: Bandage, color: "text-rose-600", bg: "bg-rose-50", to: "/wounds" },
  { key: "total_patients", label: "total_patients", icon: UsersIcon, color: "text-slate-700", bg: "bg-slate-100", to: "/patients" },
];

const ALERTS = [
  { key: "risk_alerts", label: "risk_alerts", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", to: "/patients" },
  { key: "adverse_events_week", label: "adverse_events", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", to: "/hbot-sessions" },
  { key: "missing_anamnesis", label: "missing_anamnesis", icon: FileWarning, color: "text-amber-600", bg: "bg-amber-50", to: "/patients" },
  { key: "missing_consents", label: "missing_consents", icon: FileX, color: "text-amber-700", bg: "bg-amber-50", to: "/patients" },
];

export default function Dashboard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [s, setS] = useState(null);

  useEffect(() => { api.get("/dashboard/stats").then(setS).catch(() => {}); }, []);

  if (!s) return <div className="text-slate-400">{t("loading")}</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-6 h-6 text-teal-600" />
        <h1 className="text-2xl sm:text-3xl font-heading font-bold">{t("dashboard")}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-5">
        {KPIS.map((k) => (
          <Card key={k.key} data-testid={`kpi-${k.key}`} onClick={() => navigate(k.to)}
            className="p-4 cursor-pointer hover:border-teal-500 hover:shadow-md transition-all border border-slate-200">
            <div className={`w-9 h-9 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}><k.icon className="w-5 h-5" /></div>
            <div className="text-2xl font-heading font-bold">{s[k.key] ?? 0}</div>
            <div className="text-xs text-slate-500 mt-0.5">{t(k.label)}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {ALERTS.map((a) => (
          <Card key={a.key} data-testid={`alert-${a.key}`} onClick={() => navigate(a.to)}
            className={`p-4 cursor-pointer hover:shadow-md transition-all border ${s[a.key] > 0 ? "border-red-200" : "border-slate-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-heading font-bold ${s[a.key] > 0 ? a.color : "text-slate-800"}`}>{s[a.key] ?? 0}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t(a.label)}</div>
              </div>
              <a.icon className={`w-5 h-5 ${a.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 border border-slate-200">
          <h3 className="font-heading font-semibold mb-4">{t("doctor_distribution")}</h3>
          {s.doctor_distribution?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={s.doctor_distribution}>
                <XAxis dataKey="doctor" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="count" fill="#0D9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400">Veri yok</p>}
        </Card>

        <Card className="p-5 border border-slate-200">
          <h3 className="font-heading font-semibold mb-4">{t("recent_actions")}</h3>
          <div className="space-y-2 max-h-[220px] overflow-auto">
            {(s.recent_actions || []).map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                <span><span className="font-medium">{a.user_name || "Sistem"}</span> <span className="text-slate-400">· {a.action} {a.record_type}</span></span>
                <span className="text-xs text-slate-400">{fmtDate(a.timestamp)}</span>
              </div>
            ))}
            {!(s.recent_actions || []).length && <p className="text-sm text-slate-400">Kayıt yok</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
