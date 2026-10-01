import React, { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function PortalAccessButton({ patient }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(patient.portal_email || "");
  const [password, setPassword] = useState("");

  const save = async () => {
    try {
      await api.post(`/patients/${patient.id}/portal-access`, { email, password });
      toast.success("Hasta portalı erişimi oluşturuldu");
      setOpen(false);
    } catch (e) { toast.error(e.response?.data?.detail ? String(e.response.data.detail) : "Hata"); }
  };

  return (
    <>
      <Button data-testid="portal-access-btn" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="w-4 h-4 mr-2" />Portal Erişimi
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hasta Portalı Erişimi</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">{patient.first_name} {patient.last_name} için giriş bilgisi oluşturun. Hasta bu bilgilerle kendi portalına girip formlarını doldurabilir.</p>
          {patient.portal_email && <p className="text-xs text-teal-700">Mevcut erişim: {patient.portal_email} (yeni bilgi girerseniz güncellenemez, farklı e-posta gerekir)</p>}
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">E-posta</Label><Input data-testid="portal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Şifre</Label><Input data-testid="portal-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" placeholder="En az 4 karakter" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="portal-access-save" onClick={save} className="bg-teal-600 hover:bg-teal-700">Oluştur</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
