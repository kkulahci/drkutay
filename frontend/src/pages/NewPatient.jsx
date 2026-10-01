import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { PageHeader } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const FIELDS = [
  ["first_name", "first_name", "text", true], ["last_name", "last_name", "text", true],
  ["tc_kimlik_no", "tc", "text"], ["birth_date", "birth_date", "date"],
  ["gender", "gender", "select", false, ["Erkek", "Kadın", "Diğer"]],
  ["blood_type", "blood_type", "select", false, ["A Rh+", "A Rh-", "B Rh+", "B Rh-", "AB Rh+", "AB Rh-", "0 Rh+", "0 Rh-"]],
  ["phone", "phone", "text"], ["phone2", "phone2", "text"], ["email", "email", "text"],
  ["emergency_contact", "emergency_contact", "text"],
  ["referral_institution", "referral_institution", "text"], ["referral_doctor", "referral_doctor", "text"],
];

export default function NewPatient() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error("Ad ve soyad zorunludur"); return; }
    setSaving(true);
    try {
      const p = await api.post("/patients", form);
      toast.success(`Hasta oluşturuldu: ${p.patient_number}`);
      navigate(`/patients/${p.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail ? String(err.response.data.detail) : "Hata");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title={t("new_patient")} subtitle="Hasta numarası otomatik oluşturulur" />
      <Card className="border border-slate-200 p-6 max-w-3xl">
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map(([k, label, type, req, opts]) => (
            <div key={k}>
              <Label className="text-xs">{t(label)}{req && " *"}</Label>
              {type === "select" ? (
                <Select value={form[k] || ""} onValueChange={(v) => set(k, v)}>
                  <SelectTrigger data-testid={`np-${k}`} className="mt-1"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input data-testid={`np-${k}`} type={type} value={form[k] || ""} onChange={(e) => set(k, e.target.value)} className="mt-1" />
              )}
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label className="text-xs">{t("address")}</Label>
            <Textarea data-testid="np-address" value={form.address || ""} onChange={(e) => set("address", e.target.value)} className="mt-1" rows={2} />
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/patients")}>{t("cancel")}</Button>
            <Button data-testid="np-save" type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? "..." : t("create_patient")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
