from fastapi import APIRouter, Request, Depends, HTTPException
from core.database import db, new_id, now_iso
from core.config import ROLES
from core.security import hash_password
from core.deps import get_current_user, require_roles, clinic_filter
from core.audit import log_action
from models import UserCreateInput, UserUpdateInput

router = APIRouter(prefix="/users")


def _public(u):
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


@router.get("")
async def list_users(user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"))):
    q = {"deleted_at": None}
    q.update(clinic_filter(user))
    users = await db.users.find(q, {"password_hash": 0, "_id": 0}).to_list(1000)
    return users


@router.post("")
async def create_user(data: UserCreateInput, request: Request,
                      user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN"))):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail="Geçersiz rol")
    clinic_id = data.clinic_id if user.get("role") == "SUPER_ADMIN" else user.get("clinic_id")
    doc = {
        "id": new_id(), "email": email, "password_hash": hash_password(data.password),
        "name": data.name, "role": data.role, "clinic_id": clinic_id,
        "phone": data.phone, "title": data.title, "auth_provider": "password",
        "active": True, "created_at": now_iso(), "deleted_at": None,
    }
    await db.users.insert_one(doc)
    await log_action(user, "CREATE", "user", doc["id"], new_value={"email": email, "role": data.role}, request=request)
    return _public(dict(doc))


@router.put("/{user_id}")
async def update_user(user_id: str, data: UserUpdateInput, request: Request,
                      user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN"))):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.get("role") == "CLINIC_ADMIN" and target.get("clinic_id") != user.get("clinic_id"):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if "password" in updates:
        updates["password_hash"] = hash_password(updates.pop("password"))
    if "role" in updates and updates["role"] not in ROLES:
        raise HTTPException(status_code=400, detail="Geçersiz rol")
    updates["updated_at"] = now_iso()
    await db.users.update_one({"id": user_id}, {"$set": updates})
    await log_action(user, "UPDATE", "user", user_id, new_value={k: v for k, v in updates.items() if k != "password_hash"}, request=request)
    return _public(await db.users.find_one({"id": user_id}, {"_id": 0}))


@router.delete("/{user_id}")
async def delete_user(user_id: str, request: Request,
                      user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN"))):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.get("role") == "CLINIC_ADMIN" and target.get("clinic_id") != user.get("clinic_id"):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    await db.users.update_one({"id": user_id}, {"$set": {"deleted_at": now_iso(), "active": False, "deleted_by": user["id"]}})
    await log_action(user, "DELETE", "user", user_id, request=request)
    return {"status": "archived"}
