import React, { useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FileUpload({ patientId, kind = "document", category = "Diğer", woundId, assessmentId, label = "Dosya Yükle", onUploaded, testid = "file-upload" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (patientId) fd.append("patient_id", patientId);
      fd.append("category", category);
      fd.append("kind", kind);
      if (woundId) fd.append("wound_id", woundId);
      if (assessmentId) fd.append("assessment_id", assessmentId);
      const res = await api.upload("/files/upload", fd);
      toast.success("Yüklendi");
      onUploaded && onUploaded(res);
    } catch (err) {
      toast.error(err.response?.data?.detail ? String(err.response.data.detail) : "Yükleme hatası");
    } finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.gif" className="hidden" onChange={onPick} data-testid={`${testid}-input`} />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()} data-testid={testid}>
        {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}{label}
      </Button>
    </>
  );
}
