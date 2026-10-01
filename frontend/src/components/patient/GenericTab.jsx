import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { SCHEMAS } from "@/lib/schemas";
import RecordForm from "@/components/RecordForm";
import { fmtDate, StatusBadge, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function GenericTab({ patientId, endpoint, schemaKey, columns, title, canWrite }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const schema = SCHEMAS[schemaKey];

  const load = useCallback(() => { api.get(endpoint, { patient_id: patientId }).then(setItems).catch(() => {}); }, [endpoint, patientId]);
  useEffect(() => { load(); }, [load]);

  const cols = columns || schema.map((f) => [f.k, f.l, f.type]);

  const cell = (row, c) => {
    const v = row[c[0]];
    if (c[2] === "datetime" || c[2] === "date") return fmtDate(v);
    if (c[2] === "status") return <StatusBadge value={v} />;
    return v ?? "-";
  };

  return (
    <div>
      {canWrite && (
        <div className="flex justify-end mb-3">
          <Button data-testid={`add-${schemaKey}`} size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-1" /> {title}
          </Button>
        </div>
      )}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>{cols.map((c) => <th key={c[0]} className="text-left px-4 py-2.5">{c[1]}</th>)}{canWrite && <th className="w-12" />}</tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} data-testid={`${schemaKey}-row-${row.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                  {cols.map((c) => <td key={c[0]} className="px-4 py-2.5 text-slate-700">{cell(row, c)}</td>)}
                  {canWrite && <td className="px-2"><button onClick={() => { setEditing(row); setOpen(true); }} className="text-slate-400 hover:text-teal-600"><Pencil className="w-4 h-4" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && <div className="p-6"><EmptyState text="Kayıt yok" /></div>}
      </div>
      <RecordForm open={open} onClose={() => setOpen(false)} title={title} schema={schema}
        endpoint={endpoint} extra={{ patient_id: patientId }} initial={editing} onSaved={load} />
    </div>
  );
}
