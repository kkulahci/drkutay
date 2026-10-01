import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { fmtDay, EmptyState, StatusBadge } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function AnamnesisTab({ patientId, canWrite }) {
  const [list, setList] = useState([]);
  const [edits, setEdits] = useState({});
  const load = useCallback(() => api.get("/anamnesis", { patient_id: patientId }).then(setList).catch(() => {}), [patientId]);
  useEffect(() => { load(); }, [load]);

  const approve = async (a) => {
    try {
      await api.put(`/anamnesis/${a.id}`, { status: "approved", staff_notes: edits[a.id] ?? a.staff_notes });
      toast.success("Onaylandı"); load();
    } catch { toast.error("Hata"); }
  };

  return (
    <div className="space-y-3">
      {list.map((a) => (
        <div key={a.id} data-testid={`anamnesis-row-${a.id}`} className="border border-slate-200 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2">
              {a.source === "Hasta tarafından girildi" && <Badge className="bg-blue-100 text-blue-700">Hasta tarafından girildi</Badge>}
              {a.status === "approved" && <Badge className="bg-emerald-100 text-emerald-700">Onaylandı</Badge>}
              <span className="text-xs text-slate-400">{fmtDay(a.date)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {[["complaint", "Şikâyet"], ["history", "Hikâye"], ["past_history", "Özgeçmiş"], ["family_history", "Soygeçmiş"], ["medications", "İlaçlar"], ["allergies", "Alerjiler"], ["smoking_alcohol", "Sigara/Alkol"]].map(([k, l]) =>
              a[k] ? <div key={k}><span className="text-slate-400 text-xs">{l}:</span> {a[k]}</div> : null)}
          </div>
          {a.safety_flags && <div className="mt-2 text-xs text-red-600">Güvenlik taraması işaretleri mevcut — Güvenlik sekmesine bakın.</div>}
          {canWrite && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <Textarea placeholder="Personel notu / ek bilgi / düzeltme" defaultValue={a.staff_notes || ""} onChange={(e) => setEdits((p) => ({ ...p, [a.id]: e.target.value }))} rows={2} />
              <div className="flex justify-end mt-2">
                <Button data-testid={`approve-anamnesis-${a.id}`} size="sm" onClick={() => approve(a)} className="bg-teal-600 hover:bg-teal-700"><CheckCircle2 className="w-4 h-4 mr-1" />Onayla</Button>
              </div>
            </div>
          )}
        </div>
      ))}
      {!list.length && <EmptyState text="Anamnez kaydı yok. Hasta kiosk formunu doldurabilir." />}
    </div>
  );
}
