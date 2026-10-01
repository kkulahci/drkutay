from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from core.database import db
from core.deps import get_current_user, clinic_filter
from core.config import STAFF_ROLES
from core.deps import require_roles

router = APIRouter(prefix="/dashboard")


def _today_range():
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start.isoformat(), (start + timedelta(days=1)).isoformat()


@router.get("/stats")
async def stats(user: dict = Depends(require_roles(*STAFF_ROLES))):
    base = {"deleted_at": None}
    base.update(clinic_filter(user))
    today_start, today_end = _today_range()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    def day_q(field="date"):
        return {**base, field: {"$gte": today_start, "$lt": today_end}}

    appts_today = await db.appointments.count_documents(day_q())
    sessions_today = await db.hbot_sessions.count_documents(day_q())
    active_plans = await db.hbot_treatment_plans.count_documents({**base, "status": {"$in": ["Aktif", "active"]}})
    new_patients = await db.patients.count_documents({**base, "created_at": {"$gte": week_ago}})
    active_wounds = len(await db.wounds.distinct("patient_id", {**base, "status": {"$ne": "Kapandı"}}))
    total_patients = await db.patients.count_documents(base)

    # missing anamnesis: patients without any anamnesis record
    patient_ids = await db.patients.distinct("id", base)
    with_anamnesis = set(await db.patient_anamnesis.distinct("patient_id", base))
    with_consent = set(await db.consents.distinct("patient_id", base))
    missing_anamnesis = len([pid for pid in patient_ids if pid not in with_anamnesis])
    missing_consents = len([pid for pid in patient_ids if pid not in with_consent])

    # risk alerts: safety screenings flagged + recent adverse events
    risk_alerts = await db.hbot_safety_screenings.count_documents({**base, "has_risk": True, "doctor_outcome": {"$in": [None, "", "Ek değerlendirme gerekli"]}})
    adverse = await db.adverse_events.count_documents({**base, "created_at": {"$gte": week_ago}})

    recent_audit = await db.audit_logs.find(base, {"_id": 0}).sort("timestamp", -1).limit(12).to_list(12)

    # doctor distribution
    pipeline = [{"$match": base}, {"$group": {"_id": "$doctor_name", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    doctor_dist = await db.hbot_sessions.aggregate(pipeline).to_list(20)

    return {
        "appointments_today": appts_today,
        "hbot_sessions_today": sessions_today,
        "active_hbot_patients": active_plans,
        "new_patients_week": new_patients,
        "active_wound_patients": active_wounds,
        "total_patients": total_patients,
        "risk_alerts": risk_alerts,
        "adverse_events_week": adverse,
        "missing_anamnesis": missing_anamnesis,
        "missing_consents": missing_consents,
        "recent_actions": recent_audit,
        "doctor_distribution": [{"doctor": d["_id"] or "Atanmamış", "count": d["count"]} for d in doctor_dist],
    }


@router.get("/appointments-today")
async def appointments_today(user: dict = Depends(require_roles(*STAFF_ROLES))):
    base = {"deleted_at": None}
    base.update(clinic_filter(user))
    today_start, today_end = _today_range()
    return await db.appointments.find({**base, "date": {"$gte": today_start, "$lt": today_end}}, {"_id": 0}).to_list(200)
