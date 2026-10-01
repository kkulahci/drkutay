import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { PageHeader, DemoBadge, fmtDay, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Search } from "lucide-react";

export default function Patients() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState("");

  const load = () => api.get("/patients", q ? { q } : {}).then(setPatients).catch(() => {});
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [q]);

  return (
    <div>
      <PageHeader title={t("patients")} subtitle={`${patients.length} kayıt`}>
        <Button data-testid="new-patient-btn" onClick={() => navigate("/patients/new")} className="bg-teal-600 hover:bg-teal-700">
          <UserPlus className="w-4 h-4 mr-2" /> {t("new_patient")}
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input data-testid="patient-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, numara, telefon, TC ara" className="pl-9" />
      </div>

      <Card className="border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">{t("patient_no")}</th>
                <th className="text-left px-4 py-3">{t("name")}</th>
                <th className="text-left px-4 py-3">{t("gender")}</th>
                <th className="text-left px-4 py-3">{t("phone")}</th>
                <th className="text-left px-4 py-3">{t("birth_date")}</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} data-testid={`patient-row-${p.id}`} onClick={() => navigate(`/patients/${p.id}`)}
                  className="border-t border-slate-100 hover:bg-teal-50/40 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-teal-700">{p.patient_number}</td>
                  <td className="px-4 py-3 font-medium">{p.first_name} {p.last_name}<DemoBadge item={p} /></td>
                  <td className="px-4 py-3 text-slate-600">{p.gender || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.phone || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDay(p.birth_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!patients.length && <div className="p-6"><EmptyState text={t("no_records")} /></div>}
      </Card>
    </div>
  );
}
