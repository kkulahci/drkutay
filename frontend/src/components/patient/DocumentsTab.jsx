import React, { useEffect, useState, useCallback } from "react";
import { api, fileUrl } from "@/lib/api";
import { fmtDate, EmptyState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import FileUpload from "@/components/FileUpload";
import { FileText, Image as ImageIcon, Download } from "lucide-react";

export default function DocumentsTab({ patientId, canWrite }) {
  const [files, setFiles] = useState([]);
  const load = useCallback(() => api.get("/files", { patient_id: patientId }).then(setFiles).catch(() => {}), [patientId]);
  useEffect(() => { load(); }, [load]);

  const isImage = (ct) => (ct || "").startsWith("image/");

  return (
    <div>
      {canWrite && (
        <div className="flex justify-end mb-3 gap-2">
          <FileUpload patientId={patientId} kind="document" category="Laboratuvar" label="Laboratuvar" testid="upload-lab" onUploaded={load} />
          <FileUpload patientId={patientId} kind="document" category="Epikriz" label="Epikriz" testid="upload-epikriz" onUploaded={load} />
          <FileUpload patientId={patientId} kind="document" category="Diğer" label="Belge Yükle" testid="upload-document" onUploaded={load} />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {files.map((f) => (
          <a key={f.id} data-testid={`file-${f.id}`} href={fileUrl(f.id)} target="_blank" rel="noreferrer"
            className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-teal-500 transition-colors">
            <div className="h-28 bg-slate-50 flex items-center justify-center">
              {isImage(f.content_type)
                ? <img src={fileUrl(f.id)} alt={f.original_filename} className="w-full h-full object-cover" />
                : <FileText className="w-10 h-10 text-slate-300" />}
            </div>
            <div className="p-2.5">
              <div className="text-xs font-medium truncate">{f.original_filename}</div>
              <div className="flex items-center justify-between mt-1">
                <Badge className="bg-slate-100 text-slate-600 text-[10px]">{f.category}</Badge>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{fmtDate(f.created_at)}</div>
            </div>
          </a>
        ))}
      </div>
      {!files.length && <EmptyState text="Belge yok. Yukarıdan PDF/JPG/PNG yükleyebilirsiniz." />}
    </div>
  );
}
