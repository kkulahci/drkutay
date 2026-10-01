from fastapi import APIRouter, Request, Depends, HTTPException
from core.database import db, new_id, now_iso, gen_patient_number
from core.config import STAFF_ROLES
from core.deps import get_current_user, require_roles, clinic_filter
from core.audit import log_action
from core.security import hash_password
from models import PatientInput

router = APIRouter(prefix="/patients")

PATIENT_WRITE = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE", "SECRETARY"]

# Timeline is aggregated across clinical collections. Each tuple: (collection, event_type, title_field)
TIMELINE_SOURCES = [
    ("encounters", "Muayene", "chief_complaint"),
    ("diagnoses", "Tanı", "description"),
    ("lab_results", "Laboratuvar", "panel"),
    ("imaging_records", "Görüntüleme", "modality"),
    ("wound_assessments", "Yara Değerlendirmesi", "location"),
    ("wound_photos", "Yara Fotoğrafı", "filename"),
    ("hbot_treatment_plans", "HBOT Planı", "indication"),
    ("hbot_sessions", "HBOT Seansı", "session_number"),
    ("adverse_events", "Advers Olay", "event_type"),
    ("documents", "Belge", "filename"),
    ("consents", "Onam", "consent_type"),
    ("hbot_safety_screenings", "HBOT Güvenlik Taraması", "outcome"),
    ("patient_anamnesis", "Anamnez", "source"),
    ("appointments", "Randevu", "reason"),
    ("physical_examinations", "Fizik Muayene", "general_state"),
]


@router.get("")
async def list_patients(request: Request, q: str = None, user: dict = Depends(require_roles(*STAFF_ROLES))):
    query = {"deleted_at": None}
    query.update(clinic_filter(user))
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"first_name": rx}, {"last_name": rx}, {"patient_number": rx},
            {"phone": rx}, {"tc_kimlik_no": rx},
        ]
    patients = await db.patients.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return patients


@router.get("/search")
async def global_search(q: str, user: dict = Depends(require_roles(*STAFF_ROLES))):
    if not q or len(q) < 2:
        return {"patients": [], "wounds": []}
    rx = {"$regex": q, "$options": "i"}
    base = {"deleted_at": None}
    base.update(clinic_filter(user))
    patients = await db.patients.find(
        {**base, "$or": [{"first_name": rx}, {"last_name": rx}, {"patient_number": rx},
                         {"phone": rx}, {"tc_kimlik_no": rx}]}, {"_id": 0}).limit(15).to_list(15)
    wounds = await db.wounds.find(
        {**base, "$or": [{"wound_code": rx}, {"location": rx}]}, {"_id": 0}).limit(15).to_list(15)
    return {"patients": patients, "wounds": wounds}


@router.get("/{patient_id}")
async def get_patient(patient_id: str, request: Request, user: dict = Depends(require_roles(*STAFF_ROLES))):
    q = {"id": patient_id, "deleted_at": None}
    q.update(clinic_filter(user))
    p = await db.patients.find_one(q, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")
    await log_action(user, "VIEW", "patient", patient_id, patient_id=patient_id, request=request)
    return p


@router.get("/{patient_id}/timeline")
async def patient_timeline(patient_id: str, user: dict = Depends(require_roles(*STAFF_ROLES))):
    q = {"id": patient_id, "deleted_at": None}
    q.update(clinic_filter(user))
    p = await db.patients.find_one(q, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")
    events = [{
        "type": "İlk Kayıt", "date": p.get("created_at"), "title": "Hasta kaydı oluşturuldu",
        "user": p.get("created_by_name"), "record_type": "patient", "record_id": p["id"],
    }]
    for coll, etype, tfield in TIMELINE_SOURCES:
        docs = await db[coll].find({"patient_id": patient_id, "deleted_at": None}, {"_id": 0}).to_list(500)
        for d in docs:
            events.append({
                "type": etype,
                "date": d.get("date") or d.get("created_at"),
                "title": str(d.get(tfield, "")) or etype,
                "user": d.get("created_by_name"),
                "record_type": coll, "record_id": d.get("id"),
            })
    events.sort(key=lambda e: e.get("date") or "", reverse=True)
    return events


@router.post("/{patient_id}/portal-access")
async def portal_access(patient_id: str, data: dict, request: Request,
                        user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE", "SECRETARY"))):
    q = {"id": patient_id, "deleted_at": None}
    q.update(clinic_filter(user))
    p = await db.patients.find_one(q, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")
    email = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""
    if not email or len(password) < 4:
        raise HTTPException(status_code=400, detail="Geçerli e-posta ve en az 4 karakterlik şifre gerekli")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    uid = new_id()
    await db.users.insert_one({
        "id": uid, "email": email, "password_hash": hash_password(password),
        "name": f"{p['first_name']} {p['last_name']}", "role": "PATIENT",
        "clinic_id": p.get("clinic_id"), "patient_id": patient_id,
        "auth_provider": "password", "active": True, "created_at": now_iso(), "deleted_at": None,
    })
    await db.patients.update_one({"id": patient_id}, {"$set": {"portal_email": email, "portal_user_id": uid}})
    await log_action(user, "CREATE", "portal_access", uid, patient_id=patient_id, new_value={"email": email}, request=request)
    return {"status": "ok", "email": email}


@router.post("")
async def create_patient(data: PatientInput, request: Request, user: dict = Depends(require_roles(*PATIENT_WRITE))):
    doc = data.model_dump()
    doc.update({
        "id": new_id(),
        "patient_number": await gen_patient_number(),
        "clinic_id": user.get("clinic_id"),
        "created_by": user["id"], "created_by_name": user.get("name"),
        "created_at": now_iso(), "updated_at": now_iso(),
        "deleted_at": None, "deleted_by": None,
    })
    await db.patients.insert_one(doc)
    await log_action(user, "CREATE", "patient", doc["id"], patient_id=doc["id"],
                     new_value={"name": f"{data.first_name} {data.last_name}"}, request=request)
    doc.pop("_id", None)
    return doc


@router.put("/{patient_id}")
async def update_patient(patient_id: str, data: PatientInput, request: Request,
                         user: dict = Depends(require_roles(*PATIENT_WRITE))):
    q = {"id": patient_id, "deleted_at": None}
    q.update(clinic_filter(user))
    existing = await db.patients.find_one(q, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")
    updates = {**data.model_dump(), "updated_at": now_iso()}
    await db.patients.update_one({"id": patient_id}, {"$set": updates})
    await log_action(user, "UPDATE", "patient", patient_id, patient_id=patient_id,
                     old_value=existing, new_value=data.model_dump(), request=request)
    return await db.patients.find_one({"id": patient_id}, {"_id": 0})


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, request: Request,
                         user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"))):
    q = {"id": patient_id, "deleted_at": None}
    q.update(clinic_filter(user))
    existing = await db.patients.find_one(q, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")
    await db.patients.update_one({"id": patient_id}, {"$set": {"deleted_at": now_iso(), "deleted_by": user["id"]}})
    await log_action(user, "DELETE", "patient", patient_id, patient_id=patient_id, request=request)
    return {"status": "archived"}
