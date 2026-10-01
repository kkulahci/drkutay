import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function toInputDatetime(v) {
  if (!v) return "";
  try { return new Date(v).toISOString().slice(0, 16); } catch { return ""; }
}

function IcdField({ value, onChange }) {
  const [q, setQ] = useState(value || "");
  const [opts, setOpts] = useState([]);
  useEffect(() => { setQ(value || ""); }, [value]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (q && q.length >= 1) { try { setOpts(await api.get("/reference/icd", { q })); } catch {} }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <Input value={q} onChange={(e) => { setQ(e.target.value); onChange(e.target.value); }} placeholder="ICD kodu ara" />
      {opts.length > 0 && q.length >= 1 && (
        <div className="absolute z-50 top-11 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow max-h-48 overflow-auto">
          {opts.slice(0, 8).map((o) => (
            <button type="button" key={o.id} onClick={() => { onChange(o.code); setQ(o.code); setOpts([]); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">
              <span className="font-mono text-teal-700">{o.code}</span> — {o.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecordForm({ open, onClose, title, schema, endpoint, extra = {}, initial = null, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const init = {};
      schema.forEach((f) => { init[f.k] = initial ? initial[f.k] ?? "" : ""; });
      setForm(init);
    }
  }, [open, initial, schema]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, ...extra };
      if (initial?.id) await api.put(`${endpoint}/${initial.id}`, payload);
      else await api.post(endpoint, payload);
      toast.success("Kaydedildi");
      onSaved && onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail ? String(e.response.data.detail) : "Hata oluştu");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schema.map((f) => (
            <div key={f.k} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label className="text-xs">{f.l}</Label>
              {f.type === "textarea" ? (
                <Textarea data-testid={`field-${f.k}`} value={form[f.k] || ""} onChange={(e) => set(f.k, e.target.value)} className="mt-1" rows={3} />
              ) : f.type === "select" ? (
                <Select value={form[f.k] || ""} onValueChange={(v) => set(f.k, v)}>
                  <SelectTrigger data-testid={`field-${f.k}`} className="mt-1"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{f.opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : f.type === "icd" ? (
                <div className="mt-1"><IcdField value={form[f.k]} onChange={(v) => set(f.k, v)} /></div>
              ) : (
                <Input data-testid={`field-${f.k}`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"}
                  value={f.type === "datetime" ? toInputDatetime(form[f.k]) : (form[f.k] ?? "")}
                  onChange={(e) => set(f.k, f.type === "datetime" && e.target.value ? new Date(e.target.value).toISOString() : e.target.value)} className="mt-1" />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button data-testid="record-form-save" onClick={submit} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving ? "..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
