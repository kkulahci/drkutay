import React, { useEffect, useState, useCallback } from "react";
import { api, fileUrl } from "@/lib/api";
import { fmtDay, EmptyState } from "@/components/common";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

const TISSUE = [["granulation", "Granülasyon"], ["epithelization", "Epitelizasyon"], ["slough", "Slough/Fibrin"], ["necrosis", "Nekroz"], ["bone", "Kemik/Tendon"]];

function AssessmentForm({ patientId, woundId, onClose, onSaved }) {
  const [f, setF] = useState({ tissue: { granulation: 0, epithelization: 0, slough: 0, necrosis: 0, bone: 0 } });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setT = (k, v) => setF((p) => ({ ...p, tissue: { ...p.tissue, [k]: Number(v) || 0 } }));
  const area = (Number(f.length) || 0) * (Number(f.width) || 0);
  const tissueSum = Object.values(f.tissue).reduce((a, b) => a + (Number(b) || 0), 0);

  const save = async () => {
    if (tissueSum !== 100) { toast.error(`Doku yüzdeleri toplamı 100 olmalı (şu an ${tissueSum})`); return; }
    try {
      await api.post("/wound-assessments", { ...f, patient_id: patientId, wound_id: woundId, area: Math.round(area * 100) / 100, date: new Date().toISOString() });
      toast.success("Değerlendirme eklendi"); onSaved(); onClose();
    } catch (e) { toast.error("Hata"); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Yara Değerlendirmesi</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">Uzunluk (cm)</Label><Input data-testid="wa-length" type="number" value={f.length || ""} onChange={(e) => set("length", e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Genişlik (cm)</Label><Input data-testid="wa-width" type="number" value={f.width || ""} onChange={(e) => set("width", e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Derinlik (cm)</Label><Input type="number" value={f.depth || ""} onChange={(e) => set("depth", e.target.value)} className="mt-1" /></div>
          <div className="col-span-2 sm:col-span-3 bg-teal-50 rounded-lg p-2 text-sm text-teal-800">Alan (otomatik): <b>{area.toFixed(2)} cm²</b></div>
          <div><Label className="text-xs">Tünelleşme</Label><Input value={f.tunneling || ""} onChange={(e) => set("tunneling", e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Cepleşme</Label><Input value={f.undermining || ""} onChange={(e) => set("undermining", e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Eksuda</Label>
            <Select value={f.exudate || ""} onValueChange={(v) => set("exudate", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="-" /></SelectTrigger>
              <SelectContent>{["Yok", "Az", "Orta", "Çok"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Koku</Label><Input value={f.odor || ""} onChange={(e) => set("odor", e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Eritem</Label><Input value={f.erythema || ""} onChange={(e) => set("erythema", e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Ödem</Label><Input value={f.edema || ""} onChange={(e) => set("edema", e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Maserasyon</Label><Input value={f.maceration || ""} onChange={(e) => set("maceration", e.target.value)} className="mt-1" /></div>
          <div className="col-span-2 sm:col-span-3"><Label className="text-xs">Enfeksiyon bulguları</Label><Input value={f.infection_signs || ""} onChange={(e) => set("infection_signs", e.target.value)} className="mt-1" /></div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">TIME Modeli — Doku</h4>
            <Badge className={tissueSum === 100 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>Toplam: {tissueSum}%</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TISSUE.map(([k, l]) => (
              <div key={k}><Label className="text-[11px]">{l} %</Label><Input data-testid={`wa-tissue-${k}`} type="number" value={f.tissue[k]} onChange={(e) => setT(k, e.target.value)} className="mt-1" /></div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <div><Label className="text-xs">Infection</Label>
              <Select value={f.infection || ""} onValueChange={(v) => set("infection", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>{["Yok", "Hafif", "Orta", "Şiddetli", "Probe-to-bone"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Moisture</Label>
              <Select value={f.moisture || ""} onValueChange={(v) => set("moisture", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>{["Yok", "Az", "Orta", "Çok"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Edge (Kenar)</Label>
              <Select value={f.edge || ""} onValueChange={(v) => set("edge", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>{["Maserasyon", "Eritem", "Ödem", "Fissür", "Epibol"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>

        <div className="mt-3"><Label className="text-xs">Fotoğraf URL (opsiyonel, depolama sonraki aşamada)</Label><Input data-testid="wa-photo" value={f.photo_url || ""} onChange={(e) => set("photo_url", e.target.value)} placeholder="https://..." className="mt-1" /></div>

        <DialogFooter><Button variant="outline" onClick={onClose}>İptal</Button><Button data-testid="wa-save" onClick={save} className="bg-teal-600 hover:bg-teal-700">Kaydet</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WoundTab({ patientId, canWrite }) {
  const [wounds, setWounds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [woundOpen, setWoundOpen] = useState(false);
  const [assessOpen, setAssessOpen] = useState(false);
  const [newWound, setNewWound] = useState({ side: "Sağ", status: "Açık" });
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [photos, setPhotos] = useState([]);

  const loadWounds = useCallback(() => api.get("/wounds", { patient_id: patientId }).then((w) => { setWounds(w); if (w.length && !selected) setSelected(w[0]); }).catch(() => {}), [patientId, selected]);
  useEffect(() => { loadWounds(); }, [patientId]);

  const loadAssess = useCallback(() => {
    if (!selected) return;
    api.get("/wound-assessments", { wound_id: selected.id }).then((a) => {
      setAssessments([...a].sort((x, y) => (x.date || "").localeCompare(y.date || "")));
    }).catch(() => {});
  }, [selected]);
  const loadPhotos = useCallback(() => {
    if (!selected) return;
    api.get("/wound-photos", { wound_id: selected.id }).then((ps) => {
      const sorted = [...ps].sort((x, y) => (x.date || "").localeCompare(y.date || ""));
      setPhotos(sorted);
      if (sorted.length) { setCompareA(sorted[0]); setCompareB(sorted[sorted.length - 1]); }
      else { setCompareA(null); setCompareB(null); }
    }).catch(() => {});
  }, [selected]);
  useEffect(() => { loadAssess(); loadPhotos(); }, [loadAssess, loadPhotos]);

  const saveWound = async () => {
    try { await api.post("/wounds", { ...newWound, patient_id: patientId, date: new Date().toISOString() }); toast.success("Yara eklendi"); setWoundOpen(false); setNewWound({ side: "Sağ", status: "Açık" }); loadWounds(); }
    catch { toast.error("Hata"); }
  };

  const chartData = assessments.map((a) => ({ date: fmtDay(a.date), area: a.area || 0 }));
  const initialArea = assessments[0]?.area;
  const currentArea = assessments[assessments.length - 1]?.area;
  const healingPct = (initialArea && currentArea != null) ? Math.round(((initialArea - currentArea) / initialArea) * 100) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {wounds.map((w) => (
            <button key={w.id} data-testid={`wound-tab-${w.id}`} onClick={() => setSelected(w)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${selected?.id === w.id ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 hover:border-teal-400"}`}>
              <span className="font-mono text-xs">{w.wound_code}</span> · {w.location}
            </button>
          ))}
        </div>
        {canWrite && <Button data-testid="add-wound" size="sm" onClick={() => setWoundOpen(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" />Yara</Button>}
      </div>

      {!wounds.length && <EmptyState text="Yara kaydı yok. Bir hastanın birden fazla yarası olabilir." />}

      {selected && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-teal-600" /><h4 className="font-semibold text-sm">Yara İyileşme Grafiği (cm²)</h4></div>
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="area" stroke="#0D9488" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400">Değerlendirme yok</p>}
              {healingPct != null && (
                <div className="mt-2 text-sm">
                  Değişim: <b className={healingPct >= 0 ? "text-emerald-600" : "text-red-600"}>{healingPct}%</b>
                  <span className="text-xs text-slate-400 ml-2">(sadece ölçümsel takip; klinik iyileşme kararı değildir)</span>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Fotoğraf Karşılaştırma</h4>
                {canWrite && <FileUpload patientId={patientId} kind="wound_photo" woundId={selected.id} label="Foto" testid="upload-wound-photo" onUploaded={loadPhotos} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[compareA, compareB].map((c, i) => (
                  <div key={i} className="text-center">
                    {c?.file_id ? <img src={fileUrl(c.file_id)} alt="yara" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                      : <div className="w-full h-32 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400">Fotoğraf yok</div>}
                    <div className="text-xs text-slate-500 mt-1">{c ? fmtDay(c.date) : "-"}</div>
                  </div>
                ))}
              </div>
              {photos.length > 2 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {photos.map((ph) => (
                    <img key={ph.id} src={fileUrl(ph.file_id)} alt="" onClick={() => setCompareB(ph)} className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:border-teal-500 shrink-0" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Değerlendirmeler ({assessments.length})</h4>
            {canWrite && <Button data-testid="add-assessment" size="sm" variant="outline" onClick={() => setAssessOpen(true)}><Plus className="w-4 h-4 mr-1" />Değerlendirme</Button>}
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr>
                <th className="text-left px-3 py-2">Tarih</th><th className="text-left px-3 py-2">U×G×D</th><th className="text-left px-3 py-2">Alan</th>
                <th className="text-left px-3 py-2">Infection</th><th className="text-left px-3 py-2">Moisture</th><th className="text-left px-3 py-2">Eksuda</th></tr></thead>
              <tbody>
                {[...assessments].reverse().map((a) => (
                  <tr key={a.id} className="border-t border-slate-100"><td className="px-3 py-2">{fmtDay(a.date)}</td>
                    <td className="px-3 py-2">{a.length}×{a.width}×{a.depth || 0}</td><td className="px-3 py-2 font-medium">{a.area} cm²</td>
                    <td className="px-3 py-2">{a.infection || "-"}</td><td className="px-3 py-2">{a.moisture || "-"}</td><td className="px-3 py-2">{a.exudate || "-"}</td></tr>
                ))}
              </tbody>
            </table>
            {!assessments.length && <div className="p-5"><EmptyState text="Değerlendirme yok" /></div>}
          </div>
        </div>
      )}

      <Dialog open={woundOpen} onOpenChange={setWoundOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Yara</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Anatomik konum</Label><Input data-testid="wound-location" value={newWound.location || ""} onChange={(e) => setNewWound({ ...newWound, location: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Taraf</Label><Select value={newWound.side} onValueChange={(v) => setNewWound({ ...newWound, side: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["Sağ", "Sol", "Orta"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Durum</Label><Select value={newWound.status} onValueChange={(v) => setNewWound({ ...newWound, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["Açık", "İyileşiyor", "Kapandı"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setWoundOpen(false)}>İptal</Button><Button data-testid="wound-save" onClick={saveWound} className="bg-teal-600 hover:bg-teal-700">Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {assessOpen && <AssessmentForm patientId={patientId} woundId={selected.id} onClose={() => setAssessOpen(false)} onSaved={loadAssess} />}
    </div>
  );
}
