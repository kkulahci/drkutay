"""File upload/download via storage abstraction. DB is source of truth for file
references (soft-delete only). Images served through backend with query-param auth
so <img src> works."""
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query, Request, Response
from core.database import db, new_id, now_iso
from core.deps import get_current_user, require_roles, clinic_filter
from core.config import STAFF_ROLES
from core.storage import get_storage, mime_for, APP_NAME
from core.security import decode_token
from core.audit import log_action

router = APIRouter(prefix="/files")


@router.post("/upload")
async def upload(request: Request, file: UploadFile = File(...),
                 patient_id: str = Form(None), category: str = Form("Diğer"),
                 wound_id: str = Form(None), assessment_id: str = Form(None),
                 kind: str = Form("document"),
                 user: dict = Depends(require_roles(*STAFF_ROLES))):
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya 15MB'den küçük olmalı")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    if ext not in ("jpg", "jpeg", "png", "webp", "pdf", "gif"):
        raise HTTPException(status_code=400, detail="Sadece JPG, PNG, WEBP, PDF, GIF")
    content_type = file.content_type or mime_for(file.filename)
    path = f"{APP_NAME}/uploads/{user.get('clinic_id') or 'global'}/{uuid.uuid4()}.{ext}"
    try:
        result = get_storage().save(path, data, content_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Depolama hatası: {e}")

    fid = new_id()
    meta = {
        "id": fid, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": content_type, "size": result.get("size", len(data)),
        "clinic_id": user.get("clinic_id"), "patient_id": patient_id, "category": category,
        "uploaded_by": user["id"], "uploaded_by_name": user.get("name"),
        "is_deleted": False, "created_at": now_iso(),
    }
    await db.files.insert_one(meta)

    # Create a timeline-visible record (document or wound_photo)
    base = {
        "clinic_id": user.get("clinic_id"), "patient_id": patient_id, "file_id": fid,
        "filename": file.filename, "created_by": user["id"], "created_by_name": user.get("name"),
        "created_at": now_iso(), "updated_at": now_iso(), "deleted_at": None, "deleted_by": None,
        "date": now_iso(),
    }
    if kind == "wound_photo":
        await db.wound_photos.insert_one({"id": new_id(), "wound_id": wound_id, "assessment_id": assessment_id, **base})
    else:
        await db.documents.insert_one({"id": new_id(), "category": category, **base})

    await log_action(user, "CREATE", "file", fid, patient_id=patient_id,
                     new_value={"filename": file.filename, "category": category}, request=request)
    return {"id": fid, "filename": file.filename, "content_type": content_type, "download_url": f"/api/files/{fid}/download"}


async def _auth_from_query(token: str):
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        return await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    except Exception:
        return None


@router.get("/{file_id}/download")
async def download(file_id: str, request: Request, auth: str = Query(None)):
    user = None
    try:
        user = await get_current_user(request)
    except Exception:
        user = await _auth_from_query(auth)
    if not user:
        raise HTTPException(status_code=401, detail="Yetkisiz")
    rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    if user.get("role") != "SUPER_ADMIN" and rec.get("clinic_id") != user.get("clinic_id"):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    try:
        content, ct = get_storage().load(rec["storage_path"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Depolama hatası: {e}")
    return Response(content=content, media_type=rec.get("content_type", ct))


@router.get("")
async def list_files(patient_id: str = None, user: dict = Depends(require_roles(*STAFF_ROLES))):
    q = {"is_deleted": False}
    q.update(clinic_filter(user))
    if patient_id:
        q["patient_id"] = patient_id
    return await db.files.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
