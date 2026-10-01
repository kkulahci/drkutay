import { api } from "@/lib/api";
import { fmtDate, fmtDay } from "@/components/common";

// One-click SOAP / Polyclinic report. Opens a printable window (PDF via browser print).
export async function generateSoapReport(patient) {
  const pid = patient.id;
  const [enc, dx, labs, wounds, plans, anamnesis] = await Promise.all([
    api.get("/encounters", { patient_id: pid }).catch(() => []),
    api.get("/diagnoses", { patient_id: pid }).catch(() => []),
    api.get("/lab-results", { patient_id: pid }).catch(() => []),
    api.get("/wounds", { patient_id: pid }).catch(() => []),
    api.get("/hbot-treatment-plans", { patient_id: pid }).catch(() => []),
    api.get("/anamnesis", { patient_id: pid }).catch(() => []),
  ]);
  const lastEnc = enc[0] || {};
  const row = (label, val) => val ? `<tr><td class="l">${label}</td><td>${val}</td></tr>` : "";
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Poliklinik Raporu - ${patient.patient_number}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;padding:40px;max-width:800px;margin:auto;}
    h1{color:#0D9488;font-size:22px;margin-bottom:0;} .sub{color:#64748B;font-size:12px;margin-top:4px;}
    h2{font-size:14px;border-bottom:2px solid #0D9488;padding-bottom:4px;margin-top:24px;color:#0F172A;}
    table{width:100%;border-collapse:collapse;font-size:13px;} td{padding:4px 8px;vertical-align:top;}
    td.l{color:#64748B;width:200px;font-weight:600;} .box{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;font-size:13px;margin-top:6px;}
    .foot{margin-top:40px;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:10px;}
    @media print{button{display:none;}}
  </style></head><body>
  <button onclick="window.print()" style="padding:8px 16px;background:#0D9488;color:#fff;border:none;border-radius:8px;cursor:pointer;margin-bottom:20px;">Yazdır / PDF</button>
  <h1>Poliklinik Raporu</h1><div class="sub">HBOT Klinik · ${fmtDate(new Date().toISOString())}</div>
  <h2>Hasta Bilgileri</h2><table>
    ${row("Hasta No", patient.patient_number)}${row("Ad Soyad", `${patient.first_name} ${patient.last_name}`)}
    ${row("Doğum Tarihi", fmtDay(patient.birth_date))}${row("Cinsiyet", patient.gender)}
    ${row("Telefon", patient.phone)}${row("Kan Grubu", patient.blood_type)}
  </table>
  <h2>Şikâyet & Anamnez</h2><div class="box">${lastEnc.chief_complaint || anamnesis[0]?.complaint || "-"}<br>${anamnesis[0]?.history || lastEnc.history || ""}</div>
  <h2>Muayene</h2><div class="box">${lastEnc.notes || "-"}</div>
  <h2>Tanılar</h2><div class="box">${dx.length ? dx.map((d) => `${d.icd_code || ""} ${d.description || ""}`).join("<br>") : "-"}</div>
  <h2>Yara Değerlendirmesi</h2><div class="box">${wounds.length ? wounds.map((w) => `${w.wound_code} · ${w.location} (${w.side || ""}) — ${w.status || ""}`).join("<br>") : "-"}</div>
  <h2>HBOT Planı</h2><div class="box">${plans.length ? plans.map((p) => `${p.indication} · ${p.protocol || ""} ${p.ata || ""} ATA · ${p.planned_sessions || "?"} seans — ${p.status || ""}`).join("<br>") : "-"}</div>
  <h2>Laboratuvar</h2><div class="box">${labs.length ? labs.map((l) => `${fmtDay(l.date)}: ${l.panel || ""} ${l.glucose ? "Glukoz:" + l.glucose : ""} ${l.crp ? "CRP:" + l.crp : ""}`).join("<br>") : "-"}</div>
  <h2>Doktor</h2><div class="box">${lastEnc.doctor_name || plans[0]?.doctor_name || "-"}</div>
  <div class="foot">Bu rapor HBOT Klinik hasta yönetim sisteminden oluşturulmuştur. Klinik karar destek amaçlıdır; nihai sorumluluk yetkili hekime aittir.</div>
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}
