import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { SAFETY_QUESTIONS } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Activity, ChevronLeft, ChevronRight, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { key: "identity", title: "Kimlik ve İletişim" },
  { key: "complaint", title: "Şikâyet ve Hastalık Hikâyesi" },
  { key: "past", title: "Özgeçmiş" },
  { key: "family", title: "Soygeçmiş" },
  { key: "meds", title: "İlaçlar" },
  { key: "allergies", title: "Alerjiler" },
  { key: "habits", title: "Sigara / Alkol" },
  { key: "safety", title: "HBOT Güvenlik Taraması" },
  { key: "review", title: "Form Kontrolü ve Gönderim" },
];

export default function AnamnesisWizard() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ safety: {} });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { api.get(`/patients/${patientId}`).then(setPatient).catch(() => {}); }, [patientId]);
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));
  const setSafety = (k, v) => setData((p) => ({ ...p, safety: { ...p.safety, [k]: v } }));
  const hasRisk = Object.values(data.safety || {}).some(Boolean);

  const submit = async () => {
    try {
      await api.post("/anamnesis", {
        patient_id: patientId, source: "Hasta tarafından girildi", status: "patient_submitted",
        complaint: data.complaint, history: data.history, past_history: data.past,
        family_history: data.family, medications: data.meds, allergies: data.allergies,
        smoking_alcohol: data.habits, safety_answers: data.safety, safety_flags: hasRisk,
        date: new Date().toISOString(),
      });
      if (hasRisk) {
        await api.post("/hbot-safety-screenings", {
          patient_id: patientId, answers: data.safety, has_risk: true,
          outcome: "Hekim değerlendirmesi gerekli", source: "Hasta anamnez formu", date: new Date().toISOString(),
        });
      }
      setSubmitted(true);
    } catch { toast.error("Gönderilemedi. Lütfen personele bildirin."); }
  };

  const bigInput = "h-14 text-lg";
  const s = STEPS[step];

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-emerald-600" /></div>
          <h1 className="text-2xl font-heading font-extrabold mb-2">Teşekkürler!</h1>
          <p className="text-slate-500 mb-6">Formunuz başarıyla gönderildi. Sağlık personeli bilgilerinizi gözden geçirecektir.</p>
          <Button onClick={() => navigate(`/patients/${patientId}`)} className="bg-teal-600 hover:bg-teal-700 h-12 text-lg">Devam</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
        <span className="font-heading font-extrabold text-lg">Anamnez Formu</span>
        {patient && <span className="text-slate-400 text-sm ml-auto">{patient.first_name} {patient.last_name}</span>}
      </header>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-10 flex flex-col min-h-[70vh]">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-teal-600">Adım {step + 1} / {STEPS.length}</span>
              <span className="text-sm text-slate-400">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-teal-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold mb-6">{s.title}</h2>

          <div className="flex-1 space-y-4">
            {s.key === "identity" && patient && (
              <div className="space-y-4 text-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-base">Ad</Label><Input className={bigInput} value={patient.first_name} readOnly /></div>
                  <div><Label className="text-base">Soyad</Label><Input className={bigInput} value={patient.last_name} readOnly /></div>
                </div>
                <div><Label className="text-base">Telefon (güncelleyebilirsiniz)</Label><Input data-testid="wiz-phone" className={bigInput} value={data.phone ?? patient.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
              </div>
            )}
            {s.key === "complaint" && (<>
              <div><Label className="text-base">Şikâyetiniz nedir?</Label><Textarea data-testid="wiz-complaint" className="text-lg mt-1" rows={3} value={data.complaint || ""} onChange={(e) => set("complaint", e.target.value)} /></div>
              <div><Label className="text-base">Ne zaman başladı, nasıl gelişti?</Label><Textarea className="text-lg mt-1" rows={4} value={data.history || ""} onChange={(e) => set("history", e.target.value)} /></div>
            </>)}
            {s.key === "past" && <div><Label className="text-base">Geçirdiğiniz hastalıklar, ameliyatlar</Label><Textarea data-testid="wiz-past" className="text-lg mt-1" rows={6} value={data.past || ""} onChange={(e) => set("past", e.target.value)} /></div>}
            {s.key === "family" && <div><Label className="text-base">Ailede önemli hastalıklar</Label><Textarea className="text-lg mt-1" rows={6} value={data.family || ""} onChange={(e) => set("family", e.target.value)} /></div>}
            {s.key === "meds" && <div><Label className="text-base">Kullandığınız ilaçlar</Label><Textarea data-testid="wiz-meds" className="text-lg mt-1" rows={6} value={data.meds || ""} onChange={(e) => set("meds", e.target.value)} /></div>}
            {s.key === "allergies" && <div><Label className="text-base">Alerjileriniz (ilaç, gıda vb.)</Label><Textarea className="text-lg mt-1" rows={6} value={data.allergies || ""} onChange={(e) => set("allergies", e.target.value)} /></div>}
            {s.key === "habits" && <div><Label className="text-base">Sigara / alkol kullanımı</Label><Textarea className="text-lg mt-1" rows={5} value={data.habits || ""} onChange={(e) => set("habits", e.target.value)} /></div>}
            {s.key === "safety" && (
              <div className="space-y-1">
                <p className="text-slate-500 mb-3">Aşağıdakilerden size uyanları işaretleyin:</p>
                {SAFETY_QUESTIONS.map((q) => (
                  <div key={q.k} className="flex items-center justify-between kiosk-option border border-slate-200 rounded-xl px-4 py-3">
                    <Label className="text-base">{q.l}</Label>
                    <Switch data-testid={`wiz-safety-${q.k}`} checked={!!data.safety[q.k]} onCheckedChange={(v) => setSafety(q.k, v)} />
                  </div>
                ))}
                {hasRisk && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5" /><p className="text-sm">İşaretlediğiniz durumlar hekiminiz tarafından değerlendirilecektir.</p>
                  </div>
                )}
              </div>
            )}
            {s.key === "review" && (
              <div className="space-y-2 text-base">
                <p className="text-slate-500 mb-4">Bilgilerinizi kontrol edip gönderin. Gönderdikten sonra sağlık personeli onaylayacaktır.</p>
                {[["Şikâyet", data.complaint], ["Hikâye", data.history], ["Özgeçmiş", data.past], ["İlaçlar", data.meds], ["Alerjiler", data.allergies]].map(([l, v]) => (
                  <div key={l} className="border-b border-slate-100 py-2"><span className="text-slate-400 text-sm">{l}:</span> <span>{v || "—"}</span></div>
                ))}
                <div className="py-2"><span className="text-slate-400 text-sm">Riskli güvenlik yanıtı:</span> <b className={hasRisk ? "text-amber-600" : "text-emerald-600"}>{hasRisk ? "Var (hekim değerlendirecek)" : "Yok"}</b></div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
            <Button data-testid="wiz-back" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="h-14 px-8 text-lg"><ChevronLeft className="w-5 h-5 mr-1" />Geri</Button>
            {step < STEPS.length - 1 ? (
              <Button data-testid="wiz-next" onClick={() => setStep((s) => s + 1)} className="h-14 px-8 text-lg bg-teal-600 hover:bg-teal-700">Kaydet ve Devam<ChevronRight className="w-5 h-5 ml-1" /></Button>
            ) : (
              <Button data-testid="wiz-submit" onClick={submit} className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-700"><Check className="w-5 h-5 mr-1" />Gönder</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
