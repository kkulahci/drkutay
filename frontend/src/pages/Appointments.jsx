import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { PageHeader, StatusBadge, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export default function Appointments() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [patients, setPatients] = useState({});
  const [day, setDay] = useState(startOfDay(new Date()));

  useEffect(() => {
    api.get("/appointments").then(setAll).catch(() => {});
    api.get("/patients").then((ps) => { const m = {}; ps.forEach((p) => (m[p.id] = p)); setPatients(m); }).catch(() => {});
  }, []);

  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 86400000;
  const dayAppts = all.filter((a) => { const d = a.date ? new Date(a.date).getTime() : 0; return d >= dayStart && d < dayEnd; })
    .sort((x, y) => (x.date || "").localeCompare(y.date || ""));

  const isToday = startOfDay(new Date()).getTime() === dayStart;
  const shift = (n) => setDay(new Date(dayStart + n * 86400000));

  return (
    <div>
      <PageHeader title={t("appointments")} subtitle="Günlük takvim görünümü" />
      <Card className="border border-slate-200 p-4 mb-5 flex items-center justify-between">
        <Button data-testid="appt-prev-day" variant="outline" size="sm" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-teal-600" />
          <span className="font-heading font-semibold text-lg">{day.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          {isToday && <span className="text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">{t("today")}</span>}
          {!isToday && <button data-testid="appt-today" onClick={() => setDay(startOfDay(new Date()))} className="text-xs text-teal-600 underline">Bugün</button>}
        </div>
        <Button data-testid="appt-next-day" variant="outline" size="sm" onClick={() => shift(1)}><ChevronRight className="w-4 h-4" /></Button>
      </Card>

      <div className="space-y-2">
        {dayAppts.map((a) => {
          const p = patients[a.patient_id];
          const time = a.date ? new Date(a.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
          return (
            <Card key={a.id} data-testid={`appt-${a.id}`} onClick={() => p && navigate(`/patients/${a.patient_id}`)}
              className="border border-slate-200 p-4 flex items-center gap-4 cursor-pointer hover:border-teal-500">
              <div className="text-center min-w-[56px]"><div className="text-lg font-heading font-bold text-teal-700">{time}</div></div>
              <div className="flex-1">
                <div className="font-medium">{p ? `${p.first_name} ${p.last_name}` : "Hasta"}</div>
                <div className="text-sm text-slate-500">{a.reason || "-"} · {a.doctor_name || ""}</div>
              </div>
              <StatusBadge value={a.status} />
            </Card>
          );
        })}
        {!dayAppts.length && <EmptyState text="Bu gün için randevu yok. Randevular hasta profilinden eklenir." />}
      </div>
    </div>
  );
}
