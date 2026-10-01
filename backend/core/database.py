"""Single data-access point (repository layer boundary). Switching DB providers
later only touches this module, keeping business logic DB-agnostic."""
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


async def next_sequence(name: str) -> int:
    doc = await db.counters.find_one_and_update(
        {"_id": name}, {"$inc": {"seq": 1}}, upsert=True, return_document=True
    )
    return doc["seq"]


async def gen_patient_number() -> str:
    year = datetime.now(timezone.utc).year
    seq = await next_sequence(f"patient_{year}")
    return f"HB-{year}-{seq:06d}"


async def gen_wound_code() -> str:
    seq = await next_sequence("wound")
    return f"W-{seq:05d}"
