from fastapi import APIRouter, Request, Depends, HTTPException
from core.database import db, new_id, now_iso
from core.deps import get_current_user, require_roles, clinic_filter
from core.audit import log_action
from models import ClinicInput

router = APIRouter(prefix="/clinics")


@router.get("")
async def list_clinics(user: dict = Depends(get_current_user)):
    q = {"deleted_at": None}
    if user.get("role") != "SUPER_ADMIN":
        q["id"] = user.get("clinic_id")
    return await db.clinics.find(q, {"_id": 0}).to_list(500)


@router.post("")
async def create_clinic(data: ClinicInput, request: Request,
                        user: dict = Depends(require_roles("SUPER_ADMIN"))):
    doc = data.model_dump()
    doc.update({"id": new_id(), "created_at": now_iso(), "created_by": user["id"], "deleted_at": None})
    await db.clinics.insert_one(doc)
    await log_action(user, "CREATE", "clinic", doc["id"], new_value=data.model_dump(), request=request)
    doc.pop("_id", None)
    return doc


@router.put("/{clinic_id}")
async def update_clinic(clinic_id: str, data: ClinicInput, request: Request,
                        user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN"))):
    if user.get("role") == "CLINIC_ADMIN" and user.get("clinic_id") != clinic_id:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    await db.clinics.update_one({"id": clinic_id}, {"$set": {**data.model_dump(), "updated_at": now_iso()}})
    await log_action(user, "UPDATE", "clinic", clinic_id, new_value=data.model_dump(), request=request)
    return await db.clinics.find_one({"id": clinic_id}, {"_id": 0})
