"""Generic clinic-scoped, soft-delete, audited CRUD router factory.
Keeps clinical modules DRY and consistent. Business rules stay here, not in the frontend."""
from fastapi import APIRouter, Request, Depends, HTTPException
from .database import db, new_id, now_iso, gen_wound_code
from .deps import get_current_user, require_roles, clinic_filter
from .audit import log_action

PROJECTION = {"_id": 0}


def serialize(doc):
    doc.pop("_id", None)
    return doc


def make_crud_router(collection: str, write_roles, record_type: str,
                     patient_required=False, wound_code=False):
    router = APIRouter()

    @router.get("")
    async def list_items(request: Request, patient_id: str = None, wound_id: str = None,
                         user: dict = Depends(get_current_user)):
        q = {"deleted_at": None}
        q.update(clinic_filter(user))
        if patient_id:
            q["patient_id"] = patient_id
        if wound_id:
            q["wound_id"] = wound_id
        docs = await db[collection].find(q, PROJECTION).sort("created_at", -1).to_list(3000)
        return docs

    @router.get("/{item_id}")
    async def get_item(item_id: str, user: dict = Depends(get_current_user)):
        q = {"id": item_id, "deleted_at": None}
        q.update(clinic_filter(user))
        doc = await db[collection].find_one(q, PROJECTION)
        if not doc:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        return doc

    @router.post("")
    async def create_item(request: Request, user: dict = Depends(require_roles(*write_roles))):
        body = await request.json()
        if patient_required and not body.get("patient_id"):
            raise HTTPException(status_code=400, detail="patient_id zorunludur")
        doc = dict(body)
        doc["id"] = new_id()
        doc["clinic_id"] = user.get("clinic_id") if user.get("role") != "SUPER_ADMIN" else body.get("clinic_id", user.get("clinic_id"))
        doc["created_by"] = user["id"]
        doc["created_by_name"] = user.get("name")
        doc["created_at"] = now_iso()
        doc["updated_at"] = now_iso()
        doc["deleted_at"] = None
        doc["deleted_by"] = None
        if wound_code:
            doc["wound_code"] = await gen_wound_code()
        await db[collection].insert_one(doc)
        await log_action(user, "CREATE", record_type, doc["id"],
                         patient_id=doc.get("patient_id"), new_value=body, request=request)
        return serialize(doc)

    @router.put("/{item_id}")
    async def update_item(item_id: str, request: Request,
                          user: dict = Depends(require_roles(*write_roles))):
        body = await request.json()
        q = {"id": item_id, "deleted_at": None}
        q.update(clinic_filter(user))
        existing = await db[collection].find_one(q, PROJECTION)
        if not existing:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        updates = {k: v for k, v in body.items()
                   if k not in ("id", "clinic_id", "created_by", "created_at")}
        updates["updated_at"] = now_iso()
        updates["updated_by"] = user["id"]
        await db[collection].update_one({"id": item_id}, {"$set": updates})
        await log_action(user, "UPDATE", record_type, item_id,
                         patient_id=existing.get("patient_id"),
                         old_value=existing, new_value=body, request=request)
        doc = await db[collection].find_one({"id": item_id}, PROJECTION)
        return doc

    @router.delete("/{item_id}")
    async def delete_item(item_id: str, request: Request,
                          user: dict = Depends(require_roles(*write_roles))):
        q = {"id": item_id, "deleted_at": None}
        q.update(clinic_filter(user))
        existing = await db[collection].find_one(q, PROJECTION)
        if not existing:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        await db[collection].update_one(
            {"id": item_id},
            {"$set": {"deleted_at": now_iso(), "deleted_by": user["id"]}},
        )
        await log_action(user, "DELETE", record_type, item_id,
                         patient_id=existing.get("patient_id"), old_value=existing, request=request)
        return {"status": "archived", "id": item_id}

    return router
