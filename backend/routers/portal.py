"""Patient portal: a PATIENT-role user logs in with their own account and only
accesses their own forms/appointments. No staff/clinical-staff screens or data."""
from fastapi import APIRouter, Depends, HTTPException, Request
from core.database import db, new_id, now_iso
from core.deps import get_current_user

router = APIRouter(prefix="/portal")


async def _patient_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "PATIENT" or not user.get("patient_id"):
        raise HTTPException(status_code=403, detail="Sadece hasta portalı")
    return user


@router.get("/me")
async def portal_me(user: dict = Depends(_patient_user)):
    p = await db.patients.find_one({"id": user["patient_id"], "deleted_at": None}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")
    return {"id": p["id"], "first_name": p.get("first_name"), "last_name": p.get("last_name"),
            "patient_number": p.get("patient_number"), "phone": p.get("phone"),
            "gender": p.get("gender"), "birth_date": p.get("birth_date")}


@router.get("/anamnesis")
async def portal_anamnesis(user: dict = Depends(_patient_user)):
    return await db.patient_anamnesis.find({"patient_id": user["patient_id"], "deleted_at": None}, {"_id": 0}).sort("created_at", -1).to_list(50)


@router.post("/anamnesis")
async def portal_submit(request: Request, user: dict = Depends(_patient_user)):
    body = await request.json()
    p = await db.patients.find_one({"id": user["patient_id"]}, {"_id": 0})
    doc = dict(body)
    doc.update({
        "id": new_id(), "patient_id": user["patient_id"], "clinic_id": p.get("clinic_id") if p else None,
        "source": "Hasta tarafından girildi", "status": "patient_submitted",
        "created_by": user["id"], "created_by_name": f"{user.get('name')} (portal)",
        "created_at": now_iso(), "updated_at": now_iso(), "deleted_at": None, "deleted_by": None,
        "date": body.get("date") or now_iso(),
    })
    await db.patient_anamnesis.insert_one(doc)
    if body.get("safety_flags"):
        await db.hbot_safety_screenings.insert_one({
            "id": new_id(), "patient_id": user["patient_id"], "clinic_id": p.get("clinic_id") if p else None,
            "answers": body.get("safety_answers", {}), "has_risk": True,
            "outcome": "Hekim değerlendirmesi gerekli", "source": "Hasta portalı",
            "created_by": user["id"], "created_by_name": f"{user.get('name')} (portal)",
            "created_at": now_iso(), "updated_at": now_iso(), "deleted_at": None, "deleted_by": None, "date": now_iso(),
        })
    doc.pop("_id", None)
    return {"status": "ok", "id": doc["id"]}


@router.get("/appointments")
async def portal_appointments(user: dict = Depends(_patient_user)):
    return await db.appointments.find({"patient_id": user["patient_id"], "deleted_at": None}, {"_id": 0}).sort("date", -1).to_list(100)
