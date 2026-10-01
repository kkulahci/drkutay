import React, { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// AI drafts are clinical-decision-support only; a clinician must verify before saving.
export default function AISummaryButton({ patientId, capability, label }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [disclaimer, setDisclaimer] = useState("");

  const run = async () => {
    setOpen(true); setLoading(true); setDraft("");
    try {
      const res = await api.post(`/ai/${capability}`, { patient_id: patientId });
      if (res.status === "ok") { setDraft(res.draft || ""); setDisclaimer(res.disclaimer || ""); }
      else toast.error(res.message || "AI hatası");
    } catch (e) { toast.error("AI hatası"); } finally { setLoading(false); }
  };

  const saveAsNote = async () => {
    try {
      await api.post("/encounters", { patient_id: patientId, chief_complaint: label + " (AI taslağı - hekim onaylı)", notes: draft, date: new Date().toISOString(), ai_generated: true, ai_verified: true });
      toast.success("Hekim onaylı not olarak kaydedildi");
      setOpen(false);
    } catch { toast.error("Kaydedilemedi"); }
  };

  return (
    <>
      <Button data-testid={`ai-${capability}`} size="sm" variant="outline" onClick={run} className="border-teal-200 text-teal-700 hover:bg-teal-50">
        <Sparkles className="w-4 h-4 mr-1.5" />{label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-teal-600" />{label}</DialogTitle></DialogHeader>
          <div className="p-3 rounded-lg bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{disclaimer || "Bu bir AI taslağıdır. Yetkili hekim doğrulamadan kesin klinik kayıt değildir."}</span>
          </div>
          <div className="min-h-[200px] mt-2">
            {loading ? <div className="flex items-center justify-center h-40 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" />GPT 6 Luna oluşturuyor...</div>
              : <pre data-testid="ai-draft" className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{draft || "—"}</pre>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Kapat</Button>
            {draft && !loading && <Button data-testid="ai-save-note" onClick={saveAsNote} className="bg-teal-600 hover:bg-teal-700"><CheckCircle2 className="w-4 h-4 mr-1.5" />Onayla & Not Olarak Kaydet</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
