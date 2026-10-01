import React from "react";
import { Badge } from "@/components/ui/badge";

export function DemoBadge({ item }) {
  if (!item?.is_demo) return null;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 ml-2 text-[10px]">DEMO</Badge>;
}

const STATUS_COLORS = {
  "Aktif": "bg-teal-100 text-teal-800", "active": "bg-teal-100 text-teal-800",
  "Planlandı": "bg-blue-100 text-blue-800", "Tamamlandı": "bg-emerald-100 text-emerald-800",
  "İptal": "bg-slate-100 text-slate-600", "Bekletildi": "bg-amber-100 text-amber-800",
  "Açık": "bg-red-100 text-red-700", "Kapandı": "bg-emerald-100 text-emerald-800",
  "Uygun": "bg-emerald-100 text-emerald-800", "Uygun değil": "bg-red-100 text-red-700",
  "Ertelendi": "bg-amber-100 text-amber-800", "Ek değerlendirme gerekli": "bg-amber-100 text-amber-800",
};

export function StatusBadge({ value }) {
  if (!value) return null;
  return <Badge className={`${STATUS_COLORS[value] || "bg-slate-100 text-slate-700"} hover:opacity-90`}>{value}</Badge>;
}

export function fmtDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR") + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export function fmtDay(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleDateString("tr-TR"); } catch { return iso; }
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function EmptyState({ text }) {
  return <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">{text}</div>;
}
