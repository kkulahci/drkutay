import React, { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { fmtDate, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Shield } from "lucide-react";
import { toast } from "sonner";

// Versioned consent templates. Once signed, the exact text is stored with the signature
// and never altered (immutable per signed version).
const TEMPLATES = {
  "HBOT Tedavisi Onamı": { version: "1.0", text: "Hiperbarik oksijen tedavisinin amacı, uygulama şekli, olası riskleri (barotravma, oksijen toksisitesi vb.) ve alternatifleri tarafıma anlatılmıştır. (DEMO onam metni)" },
  "Yara Bakımı / Debridman Onamı": { version: "1.0", text: "Yara bakımı ve debridman işleminin amacı ve riskleri anlatılmıştır. (DEMO onam metni)" },
  "KVKK Aydınlatma Onamı": { version: "1.0", text: "Kişisel sağlık verilerimin işlenmesine ilişkin aydınlatma metnini okudum. (DEMO onam metni)" },
};

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const start = (e) => { drawing.current = true; const c = canvasRef.current.getContext("2d"); const { x, y } = pos(e); c.beginPath(); c.moveTo(x, y); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const c = canvasRef.current.getContext("2d"); const { x, y } = pos(e); c.lineTo(x, y); c.strokeStyle = "#0F172A"; c.lineWidth = 2; c.stroke(); };
  const end = () => { if (drawing.current) { drawing.current = false; onChange(canvasRef.current.toDataURL()); } };
  const clear = () => { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); onChange(null); };

  return (
    <div>
      <canvas ref={canvasRef} width={440} height={150} data-testid="signature-pad"
        className="signature-pad border border-slate-300 rounded-lg w-full bg-white"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <button type="button" onClick={clear} className="text-xs text-slate-500 mt-1 hover:text-red-600">Temizle</button>
    </div>
  );
}

export default function ConsentTab({ patientId, patient, canWrite }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [signature, setSignature] = useState(null);

  const load = useCallback(() => api.get("/consents", { patient_id: patientId }).then(setList).catch(() => {}), [patientId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!type) { toast.error("Onam türü seçin"); return; }
    if (!signature) { toast.error("İmza gerekli"); return; }
    const tpl = TEMPLATES[type];
    try {
      await api.post("/consents", {
        patient_id: patientId, consent_type: type, consent_version: tpl.version,
        consent_text: tpl.text, signature_data: signature,
        approving_professional: null, date: new Date().toISOString(),
      });
      toast.success("Onam kaydedildi"); setOpen(false); setType(""); setSignature(null); load();
    } catch { toast.error("Hata"); }
  };

  return (
    <div>
      {canWrite && <div className="flex justify-end mb-3"><Button data-testid="add-consent" size="sm" onClick={() => setOpen(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" />Onam</Button></div>}
      <div className="space-y-3">
        {list.map((c) => (
          <div key={c.id} data-testid={`consent-row-${c.id}`} className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-teal-600" /><span className="font-medium text-sm">{c.consent_type}</span><span className="text-xs text-slate-400 font-mono">v{c.consent_version}</span></div>
              <span className="text-xs text-slate-400">{fmtDate(c.date)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{c.consent_text}</p>
            {c.signature_data && <img src={c.signature_data} alt="imza" className="h-14 mt-2 border border-slate-100 rounded" />}
          </div>
        ))}
        {!list.length && <EmptyState text="Onam kaydı yok" />}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Onam ve İmza</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Onam türü</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger data-testid="consent-type" className="mt-1"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>{Object.keys(TEMPLATES).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
            {type && <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 max-h-32 overflow-auto">{TEMPLATES[type].text}<div className="text-[10px] text-slate-400 mt-1">Sürüm {TEMPLATES[type].version} — imzalandıktan sonra bu metin değiştirilemez.</div></div>}
            <div><Label className="text-xs">İmza</Label><div className="mt-1"><SignaturePad onChange={setSignature} /></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="consent-save" onClick={save} className="bg-teal-600 hover:bg-teal-700">İmzala & Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
