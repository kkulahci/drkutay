import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useLang } from "@/i18n";
import { Search } from "lucide-react";

export default function GlobalSearch() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (q.length < 2) { setRes(null); return; }
    const timer = setTimeout(async () => {
      try { const d = await api.get("/patients/search", { q }); setRes(d); setOpen(true); } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const goPatient = (id) => { setOpen(false); setQ(""); navigate(`/patients/${id}`); };

  return (
    <div className="relative flex-1 max-w-xl" ref={ref}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input data-testid="global-search" value={q} onChange={(e) => setQ(e.target.value)}
        onFocus={() => res && setOpen(true)} placeholder={t("search_placeholder")}
        className="w-full pl-10 pr-4 h-10 rounded-full bg-slate-100 border border-transparent focus:border-teal-500 focus:bg-white outline-none text-sm" />
      {open && res && (
        <div className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 max-h-96 overflow-auto">
          {(res.patients || []).length === 0 && (res.wounds || []).length === 0 && (
            <div className="text-sm text-slate-400 p-3">Sonuç yok</div>
          )}
          {(res.patients || []).map((p) => (
            <button key={p.id} data-testid={`search-result-${p.id}`} onClick={() => goPatient(p.id)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex justify-between items-center">
              <span className="font-medium">{p.first_name} {p.last_name}</span>
              <span className="text-xs text-slate-400 font-mono">{p.patient_number}</span>
            </button>
          ))}
          {(res.wounds || []).map((w) => (
            <button key={w.id} onClick={() => goPatient(w.patient_id)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex justify-between items-center">
              <span className="text-sm">{w.location}</span>
              <span className="text-xs text-red-500 font-mono">{w.wound_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
