import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, DemoBadge } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ClinicSettings() {
  const { t } = useLang();
  const { user } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [form, setForm] = useState({});
  const [sut, setSut] = useState([]);

  useEffect(() => {
    api.get("/clinics").then((cs) => { setClinics(cs); if (cs[0]) setForm(cs[0]); }).catch(() => {});
    api.get("/reference/sut/rules").then(setSut).catch(() => {});
  }, []);

  const save = async () => {
    try {
      if (form.id) await api.put(`/clinics/${form.id}`, form);
      else await api.post("/clinics", form);
      toast.success("Kaydedildi");
      api.get("/clinics").then(setClinics);
    } catch (e) { toast.error(e.response?.data?.detail ? String(e.response.data.detail) : "Hata"); }
  };

  return (
    <div>
      <PageHeader title={t("clinic_settings")} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 p-6">
          <h3 className="font-heading font-semibold mb-4">Klinik Bilgileri <DemoBadge item={form} /></h3>
          <div className="space-y-3">
            {[["name", "Klinik Adı"], ["code", "Kod"], ["phone", "Telefon"], ["city", "Şehir"], ["address", "Adres"]].map(([k, l]) => (
              <div key={k}><Label className="text-xs">{l}</Label><Input data-testid={`clinic-${k}`} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1" /></div>
            ))}
            <Button data-testid="clinic-save" onClick={save} className="bg-teal-600 hover:bg-teal-700 mt-2">{t("save")}</Button>
          </div>
        </Card>

        <Card className="border border-slate-200 p-6">
          <h3 className="font-heading font-semibold mb-1">SUT Kuralları (versiyonlu)</h3>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-4">Tüm SUT/ICD içerikleri DEMO placeholder'dır. Gerçek mevzuat değildir.</p>
          <div className="space-y-2 max-h-96 overflow-auto">
            {sut.map((r) => (
              <div key={r.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                <div className="flex justify-between"><span className="font-medium">{r.indication}</span><span className="font-mono text-xs text-teal-700">v{r.version}</span></div>
                <div className="text-xs text-slate-500 mt-1">{r.icd_code} · {r.session_rule}</div>
              </div>
            ))}
            {!sut.length && <p className="text-sm text-slate-400">Kayıt yok</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
