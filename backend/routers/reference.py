"""ICD-10 and SUT reference data. Rules are NOT hard-coded in business logic;
they live in versioned tables. Clinical/SUT content below is DEMO placeholder only."""
from fastapi import APIRouter, Depends, Request
from core.database import db, new_id, now_iso
from core.deps import get_current_user, require_roles

router = APIRouter(prefix="/reference")


@router.get("/icd")
async def list_icd(q: str = None, user: dict = Depends(get_current_user)):
    query = {}
    if q:
        rx = {"$regex": q, "$options": "i"}
        query = {"$or": [{"code": rx}, {"description": rx}]}
    return await db.icd_codes.find(query, {"_id": 0}).limit(100).to_list(100)


@router.get("/sut/indications")
async def list_sut_indications(user: dict = Depends(get_current_user)):
    return await db.sut_indications.find({}, {"_id": 0}).to_list(200)


@router.get("/sut/rules")
async def list_sut_rules(indication_id: str = None, user: dict = Depends(get_current_user)):
    q = {}
    if indication_id:
        q["indication_id"] = indication_id
    # Keep full version history; do not filter out old rules.
    return await db.sut_rules.find(q, {"_id": 0}).sort("version", -1).to_list(200)


@router.get("/sut/versions")
async def list_sut_versions(user: dict = Depends(get_current_user)):
    return await db.sut_versions.find({}, {"_id": 0}).sort("version", -1).to_list(100)


@router.post("/sut/rules")
async def create_sut_rule(request: Request, user: dict = Depends(require_roles("SUPER_ADMIN", "CLINIC_ADMIN"))):
    body = await request.json()
    doc = dict(body)
    doc.update({"id": new_id(), "created_at": now_iso(), "created_by": user["id"]})
    await db.sut_rules.insert_one(doc)
    doc.pop("_id", None)
    return doc
