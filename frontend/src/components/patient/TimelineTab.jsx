import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate, EmptyState } from "@/components/common";
import {
  Stethoscope, FileText, FlaskConical, ScanLine, Bandage, Camera, HeartPulse,
  Wind, AlertTriangle, ClipboardCheck, Shield, UserPlus, CalendarDays, Activity,
} from "lucide-react";

const ICONS = {
  "İlk Kayıt": UserPlus, "Muayene": Stethoscope, "Tanı": ClipboardCheck, "Laboratuvar": FlaskConical,
  "Görüntüleme": ScanLine, "Yara Değerlendirmesi": Bandage, "Yara Fotoğrafı": Camera,
  "HBOT Planı": HeartPulse, "HBOT Seansı": Wind, "Advers Olay": AlertTriangle,
  "Belge": FileText, "Onam": Shield, "HBOT Güvenlik Taraması": Shield, "Anamnez": ClipboardCheck,
  "Randevu": CalendarDays, "Fizik Muayene": Activity,
};

export default function TimelineTab({ patientId }) {
  const [events, setEvents] = useState([]);
  useEffect(() => { api.get(`/patients/${patientId}/timeline`).then(setEvents).catch(() => {}); }, [patientId]);

  if (!events.length) return <EmptyState text="Henüz olay yok" />;

  return (
    <div className="relative pl-2">
      <div className="relative timeline-line">
        {events.map((e, i) => {
          const Icon = ICONS[e.type] || Activity;
          return (
            <div key={i} data-testid={`timeline-event-${i}`} className="relative pl-12 pb-6">
              <div className="absolute left-0 w-8 h-8 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center z-10">
                <Icon className="w-4 h-4 text-teal-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-sm text-teal-700">{e.type}</span>
                  <span className="text-xs text-slate-400">{fmtDate(e.date)}</span>
                </div>
                <div className="text-sm text-slate-700 mt-1">{e.title}</div>
                {e.user && <div className="text-xs text-slate-400 mt-1">İşlemi yapan: {e.user}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
