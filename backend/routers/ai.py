"""AI endpoints. Builds patient context server-side (clinic-scoped), calls the AI
service, returns a DRAFT that must be clinician-verified before becoming a record."""
from fastapi import APIRouter, Depends, HTTPException
from core.database import db
from core.deps import require_roles, clinic_filter
from core.ai_service import generate, CAPABILITIES

router = APIRouter(prefix="/ai")
AI_ROLES = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"]


async def _collect(coll, patient_id, limit=20):
    return await db[coll].find({"patient_id": patient_id, "deleted_at": None}, {"_id": 0}).sort("created_at", -1).to_list(limit)


def _fmt(label, items, fields):
    if not items:
        return ""
    lines = [f"{label}:"]
    for it in items:
        lines.append("  - " + "; ".join(f"{f}={it.get(f)}" for f in fields if it.get(f) not in (None, "")))
    return "\n".join(lines)


@router.get("/capabilities")
async def capabilities(user: dict = Depends(require_roles(*AI_ROLES, "NURSE"))):
    return {"capabilities": CAPABILITIES, "enabled": True}


@router.post("/{capability}")
async def run(capability: str, body: dict, user: dict = Depends(require_roles(*AI_ROLES))):
    patient_id = body.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id gerekli")
    q = {"id": patient_id, "deleted_at": None}
    q.update(clinic_filter(user))
    p = await db.patients.find_one(q, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")

    parts = [f"Hasta: {p.get('first_name')} {p.get('last_name')} | No: {p.get('patient_number')} | "
             f"Cinsiyet: {p.get('gender')} | Doğum: {p.get('birth_date')} | Kan: {p.get('blood_type')}"]

    if capability in ("anamnesis_summary", "soap_draft", "missing_data_check", "timeline_summary"):
        parts.append(_fmt("Anamnez", await _collect("patient_anamnesis", patient_id), ["complaint", "history", "past_history", "medications", "allergies", "smoking_alcohol"]))
    if capability in ("soap_draft", "timeline_summary", "missing_data_check", "encounter_delta_summary"):
        parts.append(_fmt("Muayeneler", await _collect("encounters", patient_id), ["date", "chief_complaint", "history", "notes", "doctor_name"]))
        parts.append(_fmt("Tanılar", await _collect("diagnoses", patient_id), ["icd_code", "description"]))
        parts.append(_fmt("Laboratuvar", await _collect("lab_results", patient_id), ["date", "panel", "glucose", "hba1c", "crp", "creatinine"]))
    if capability in ("soap_draft", "timeline_summary", "missing_data_check"):
        parts.append(_fmt("HBOT Planı", await _collect("hbot_treatment_plans", patient_id), ["indication", "icd_code", "protocol", "ata", "planned_sessions", "status"]))
    if capability in ("wound_change_summary", "soap_draft", "timeline_summary"):
        parts.append(_fmt("Yara Değerlendirmeleri", await _collect("wound_assessments", patient_id, 30), ["date", "location", "length", "width", "area", "infection", "moisture"]))

    content = "\n\n".join(x for x in parts if x)
    result = await generate(capability, {"content": content})
    result["patient_id"] = patient_id
    return result
