import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { SAFETY_QUESTIONS, DIABETIC_FOOT_FIELDS } from "@/lib/schemas";
import { fmtDay, StatusBadge, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

export default function SafetyTab({ patientId, canWrite }) {
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const [answers, setAnswers] = useState({});
  const [diabetic, setDiabetic] = useState({});
  const [showDiabetic, setShowDiabetic] = useState(false);

  const load = useCallback(() => api.get("/hbot-safety-screenings", { patient_id: patientId }).then(setList).catch(() => {}), [patientId]);
  useEffect(() => { load(); }, [load]);

  const hasRisk = Object.values(answers).some(Boolean);

  const save = async (doctorOutcome) => {
    try {
      await api.post("/hbot-safety-screenings", {
        patient_id: patientId, answers, diabetic_foot: showDiabetic ? diabetic : null,
        has_risk: hasRisk, outcome: "Hekim değerlendirmesi gerekli",
        doctor_outcome: doctorOutcome || null, date: new Date().toISOString(),
      });
      toast.success("Tarama kaydedildi"); setAdding(false); setAnswers({}); setDiabetic({}); load();
    } catch { toast.error("Hata"); }
  };

  return (
    <div>
      {!adding && (
        <>
          {canWrite && <div className="flex justify-end mb-3"><Button data-testid="add-safety" size="sm" onClick={() => setAdding(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" />Güvenlik Taraması</Button></div>}
          <div className="space-y-3">
            {list.map((s) => {
              const risks = Object.entries(s.answers || {}).filter(([, v]) => v).length;
              return (
                <div key={s.id} data-testid={`safety-row-${s.id}`} className="border border-slate-200 rounded-xl p-4 bg-white">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {s.has_risk && <AlertTriangle className="w-4 h-4 text-red-600" />}
                      <span className="text-sm font-medium">{fmtDay(s.date)}</span>
                      <span className="text-xs text-slate-400">{risks} riskli yanıt</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400 text-xs">Hekim kararı:</span><StatusBadge value={s.doctor_outcome} />
                    </div>
                  </div>
                  {s.has_risk && (
                    <div className="mt-2 p-3 rounded-lg bg-red-50 border-l-4 border-red-600 text-red-900 text-sm">
                      <b>⚠ HBOT GÜVENLİK UYARISI</b> — Riskli yanıt(lar) tespit edildi. Nihai karar yetkili hekim tarafından verilmelidir.
                    </div>
                  )}
                </div>
              );
            })}
            {!list.length && <EmptyState text="Tarama kaydı yok" />}
          </div>
        </>
      )}

      {adding && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white">
          <h4 className="font-semibold mb-3">HBOT Güvenlik Taraması</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {SAFETY_QUESTIONS.map((q) => (
              <div key={q.k} className="flex items-center justify-between border-b border-slate-50 py-1">
                <Label className="text-sm">{q.l}</Label>
                <Switch data-testid={`safety-${q.k}`} checked={!!answers[q.k]} onCheckedChange={(v) => setAnswers((p) => ({ ...p, [q.k]: v }))} />
              </div>
            ))}
          </div>

          {hasRisk && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border-l-4 border-red-600 text-red-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div>
                <div className="font-bold">⚠ HBOT GÜVENLİK UYARISI</div>
                <p className="text-sm mt-1">Bir veya daha fazla riskli yanıt var. Sistem "HBOT yapılamaz" kararı vermez; bu bir klinik karar destek bilgisidir. <b>Nihai karar yetkili hekim tarafından verilmelidir.</b></p>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <Label className="text-sm">Diyabetik Ayak Modülü ekle</Label>
            <Switch data-testid="safety-diabetic-toggle" checked={showDiabetic} onCheckedChange={setShowDiabetic} />
          </div>
          {showDiabetic && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {DIABETIC_FOOT_FIELDS.map((d) => (
                <div key={d.k}><Label className="text-[11px]">{d.l}</Label><Input value={diabetic[d.k] || ""} onChange={(e) => setDiabetic((p) => ({ ...p, [d.k]: e.target.value }))} className="mt-1" /></div>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-3">
            <Label className="text-sm font-semibold">Hekim Kararı (manuel)</Label>
            <div className="flex gap-2 mt-2 flex-wrap items-end">
              <OutcomeSave save={save} />
              <Button variant="outline" onClick={() => setAdding(false)}>İptal</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OutcomeSave({ save }) {
  const [outcome, setOutcome] = useState("");
  return (
    <>
      <div className="w-56">
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger data-testid="safety-doctor-outcome"><SelectValue placeholder="Klinik sonuç seçin" /></SelectTrigger>
          <SelectContent>{["Uygun", "Ek değerlendirme gerekli", "Ertelendi", "Uygun değil"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button data-testid="safety-save" onClick={() => save(outcome)} className="bg-teal-600 hover:bg-teal-700">Kaydet</Button>
    </>
  );
}
