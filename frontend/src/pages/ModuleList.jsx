import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { PageHeader, fmtDate, StatusBadge, DemoBadge, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";

// Clinic-wide list views for sidebar modules; each row links to patient profile.
const CONFIG = {
  encounters: { endpoint: "/encounters", title: "encounters", cols: [["date", "Tarih", "date"], ["chief_complaint", "Şikâyet"], ["doctor_name", "Doktor"]] },
  hbot_treatments: { endpoint: "/hbot-treatment-plans", title: "hbot_treatments", cols: [["date", "Tarih", "date"], ["indication", "Endikasyon"], ["planned_sessions", "Seans"], ["status", "Durum", "status"]] },
  hbot_sessions: { endpoint: "/hbot-sessions", title: "hbot_sessions", cols: [["date", "Tarih", "date"], ["session_number", "Seans No"], ["chamber", "Kabin"], ["ata", "ATA"], ["doctor_name", "Doktor"]] },
  wounds: { endpoint: "/wounds", title: "wound_tracking", cols: [["wound_code", "Yara ID"], ["location", "Konum"], ["side", "Taraf"], ["status", "Durum", "status"]] },
  labs: { endpoint: "/lab-results", title: "laboratory", cols: [["date", "Tarih", "date"], ["panel", "Panel"], ["glucose", "Glukoz"], ["crp", "CRP"]] },
  imaging: { endpoint: "/imaging-records", title: "imaging", cols: [["date", "Tarih", "date"], ["modality", "Modalite"], ["region", "Bölge"]] },
  documents: { endpoint: "/documents", title: "documents", cols: [["date", "Tarih", "date"], ["filename", "Belge"], ["category", "Kategori"]] },
  reports: { endpoint: "/encounters", title: "reports", cols: [["date", "Tarih", "date"], ["chief_complaint", "Şikâyet"], ["doctor_name", "Doktor"]] },
};

export default function ModuleList({ moduleKey }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const cfg = CONFIG[moduleKey];
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState({});

  useEffect(() => {
    api.get(cfg.endpoint).then(setItems).catch(() => {});
    api.get("/patients").then((ps) => {
      const map = {}; ps.forEach((p) => (map[p.id] = p)); setPatients(map);
    }).catch(() => {});
  }, [moduleKey]);

  const render = (row, c) => {
    const val = row[c[0]];
    if (c[2] === "date") return fmtDate(val);
    if (c[2] === "status") return <StatusBadge value={val} />;
    return val ?? "-";
  };

  return (
    <div>
      <PageHeader title={t(cfg.title)} subtitle={moduleKey === "reports" ? "Hasta profilinden poliklinik raporu oluşturun" : "Klinik geneli kayıtlar"} />
      <Card className="border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Hasta</th>
                {cfg.cols.map((c) => <th key={c[0]} className="text-left px-4 py-3">{c[1]}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} data-testid={`module-row-${row.id}`} onClick={() => navigate(`/patients/${row.patient_id}`)}
                  className="border-t border-slate-100 hover:bg-teal-50/40 cursor-pointer">
                  <td className="px-4 py-3 font-medium">
                    {patients[row.patient_id] ? `${patients[row.patient_id].first_name} ${patients[row.patient_id].last_name}` : "-"}
                    {patients[row.patient_id] && <DemoBadge item={patients[row.patient_id]} />}
                  </td>
                  {cfg.cols.map((c) => <td key={c[0]} className="px-4 py-3 text-slate-600">{render(row, c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && <div className="p-6"><EmptyState text={t("no_records")} /></div>}
      </Card>
    </div>
  );
}
