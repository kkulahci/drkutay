import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { PageHeader, fmtDate, StatusBadge, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";

export default function Appointments() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const load = () => api.get("/appointments").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title={t("appointments")} subtitle="Klinik geneli randevular" />
      <Card className="border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr><th className="text-left px-4 py-3">Tarih</th><th className="text-left px-4 py-3">Sebep</th>
                <th className="text-left px-4 py-3">Doktor</th><th className="text-left px-4 py-3">Durum</th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{fmtDate(a.date)}</td>
                  <td className="px-4 py-3">{a.reason || "-"}</td>
                  <td className="px-4 py-3">{a.doctor_name || "-"}</td>
                  <td className="px-4 py-3"><StatusBadge value={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && <div className="p-6"><EmptyState text="Randevu, hasta profilinden eklenir" /></div>}
      </Card>
    </div>
  );
}
