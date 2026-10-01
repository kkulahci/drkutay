"""Public kiosk endpoints for the patient anamnesis wizard (tablet/phone/kiosk).
Exposes ONLY the minimal patient identity needed to fill the form, and accepts
the patient-submitted anamnesis. No clinical/staff data is exposed here."""
from fastapi import APIRouter, HTTPException, Request
from core.database import db, new_id, now_iso
from core.audit import log_action

router = APIRouter(prefix="/public")


@router.get("/patient/{patient_id}")
async def kiosk_patient(patient_id: str):
    p = await db.patients.find_one({"id": patient_id, "deleted_at": None}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")
    return {
        "id": p["id"], "first_name": p.get("first_name"), "last_name": p.get("last_name"),
        "phone": p.get("phone"), "patient_number": p.get("patient_number"),
    }


@router.post("/anamnesis/{patient_id}")
async def kiosk_submit(patient_id: str, request: Request):
    p = await db.patients.find_one({"id": patient_id, "deleted_at": None}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")
    body = await request.json()
    doc = dict(body)
    doc.update({
        "id": new_id(), "patient_id": patient_id, "clinic_id": p.get("clinic_id"),
        "source": "Hasta tarafından girildi", "status": "patient_submitted",
        "created_by": None, "created_by_name": "Hasta (kiosk)",
        "created_at": now_iso(), "updated_at": now_iso(), "deleted_at": None, "deleted_by": None,
        "date": body.get("date") or now_iso(),
    })
    await db.patient_anamnesis.insert_one(doc)
    if body.get("safety_flags"):
        await db.hbot_safety_screenings.insert_one({
            "id": new_id(), "patient_id": patient_id, "clinic_id": p.get("clinic_id"),
            "answers": body.get("safety_answers", {}), "has_risk": True,
            "outcome": "Hekim değerlendirmesi gerekli", "source": "Hasta anamnez formu",
            "created_by": None, "created_by_name": "Hasta (kiosk)",
            "created_at": now_iso(), "updated_at": now_iso(), "deleted_at": None, "deleted_by": None,
            "date": now_iso(),
        })
    await log_action({"id": None, "name": "Hasta (kiosk)", "clinic_id": p.get("clinic_id")},
                     "CREATE", "anamnesis", doc["id"], patient_id=patient_id, request=request)
    doc.pop("_id", None)
    return {"status": "ok", "id": doc["id"]}
