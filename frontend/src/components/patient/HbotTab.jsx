import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { SCHEMAS, ADVERSE_EVENT_OPTIONS } from "@/lib/schemas";
import RecordForm from "@/components/RecordForm";
import { fmtDate, fmtDay, StatusBadge, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function HbotTab({ patientId, canWrite }) {
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [adverse, setAdverse] = useState([]);
  const [planOpen, setPlanOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [aeOpen, setAeOpen] = useState(false);
  const [aeSession, setAeSession] = useState("");
  const [aeTypes, setAeTypes] = useState([]);
  const [aeNote, setAeNote] = useState("");

  const load = useCallback(() => {
    api.get("/hbot-treatment-plans", { patient_id: patientId }).then(setPlans).catch(() => {});
    api.get("/hbot-sessions", { patient_id: patientId }).then((s) => setSessions([...s].sort((a, b) => (b.session_number || 0) - (a.session_number || 0)))).catch(() => {});
    api.get("/adverse-events", { patient_id: patientId }).then(setAdverse).catch(() => {});
  }, [patientId]);
  useEffect(() => { load(); }, [load]);

  const saveAe = async () => {
    if (!aeTypes.length) { toast.error("En az bir olay seçin"); return; }
    try {
      await api.post("/adverse-events", { patient_id: patientId, session_id: aeSession || null, event_type: aeTypes.join(", "), events: aeTypes, note: aeNote, date: new Date().toISOString() });
      toast.success("Advers olay kaydedildi"); setAeOpen(false); setAeTypes([]); setAeNote(""); load();
    } catch { toast.error("Hata"); }
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-sm">HBOT Tedavi Planları</h4>
          {canWrite && <Button data-testid="add-hbot-plan" size="sm" onClick={() => setPlanOpen(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" />Plan</Button>}</div>
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} data-testid={`plan-row-${p.id}`} className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between flex-wrap gap-2">
              <div><div className="font-medium text-sm">{p.indication} <span className="text-xs text-slate-400 font-mono">{p.icd_code}</span></div>
                <div className="text-xs text-slate-500">{p.protocol} · {p.ata} ATA · {p.oxygen_minutes}dk · {p.planned_sessions} seans · {p.doctor_name}</div></div>
              <StatusBadge value={p.status} />
            </div>
          ))}
          {!plans.length && <EmptyState text="Plan yok" />}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-sm">HBOT Seansları ({sessions.length})</h4>
          <div className="flex gap-2">
            {canWrite && <Button data-testid="add-adverse" size="sm" variant="outline" onClick={() => setAeOpen(true)}><AlertTriangle className="w-4 h-4 mr-1" />Advers Olay</Button>}
            {canWrite && <Button data-testid="add-hbot-session" size="sm" onClick={() => setSessionOpen(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" />Seans</Button>}
          </div></div>
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr>
              <th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Tarih</th><th className="text-left px-3 py-2">Kabin</th>
              <th className="text-left px-3 py-2">ATA</th><th className="text-left px-3 py-2">O₂ dk</th><th className="text-left px-3 py-2">Operatör</th></tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} data-testid={`session-row-${s.id}`} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{s.session_number}</td>
                  <td className="px-3 py-2">{fmtDay(s.date)}</td><td className="px-3 py-2">{s.chamber || "-"}</td><td className="px-3 py-2">{s.ata || "-"}</td>
                  <td className="px-3 py-2">{s.oxygen_minutes || "-"}</td><td className="px-3 py-2">{s.operator || "-"}</td></tr>
              ))}
            </tbody>
          </table>
          {!sessions.length && <div className="p-5"><EmptyState text="Seans yok" /></div>}
        </div>
      </section>

      {adverse.length > 0 && (
        <section>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" />Advers Olaylar</h4>
          <div className="space-y-2">
            {adverse.map((a) => (
              <div key={a.id} className="border-l-4 border-red-500 bg-red-50 rounded-r-lg p-3 text-sm"><b>{a.event_type}</b> <span className="text-xs text-slate-500">· {fmtDay(a.date)}</span>{a.note && <div className="text-slate-600 text-xs mt-1">{a.note}</div>}</div>
            ))}
          </div>
        </section>
      )}

      <RecordForm open={planOpen} onClose={() => setPlanOpen(false)} title="HBOT Tedavi Planı" schema={SCHEMAS.hbot_treatment_plans} endpoint="/hbot-treatment-plans" extra={{ patient_id: patientId }} onSaved={load} />
      <RecordForm open={sessionOpen} onClose={() => setSessionOpen(false)} title="HBOT Seansı" schema={SCHEMAS.hbot_sessions} endpoint="/hbot-sessions" extra={{ patient_id: patientId }} onSaved={load} />

      <Dialog open={aeOpen} onOpenChange={setAeOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Advers Olay Kaydı</DialogTitle></DialogHeader>
          <div>
            <Label className="text-xs">İlgili seans (opsiyonel)</Label>
            <Select value={aeSession} onValueChange={setAeSession}><SelectTrigger className="mt-1"><SelectValue placeholder="Seans seçin" /></SelectTrigger>
              <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.id}>Seans {s.session_number} · {fmtDay(s.date)}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {ADVERSE_EVENT_OPTIONS.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <Checkbox data-testid={`ae-${o}`} checked={aeTypes.includes(o)} onCheckedChange={(v) => setAeTypes((p) => v ? [...p, o] : p.filter((x) => x !== o))} />{o}
              </label>
            ))}
          </div>
          <div className="mt-3"><Label className="text-xs">Not</Label><Textarea value={aeNote} onChange={(e) => setAeNote(e.target.value)} className="mt-1" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setAeOpen(false)}>İptal</Button><Button data-testid="ae-save" onClick={saveAe} className="bg-red-600 hover:bg-red-700">Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
