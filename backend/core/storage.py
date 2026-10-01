"""File-storage abstraction. V1 uses a local/placeholder adapter; switching to
S3/GCS/Emergent object storage later means only adding a new adapter here.

TODO: wire a real object-storage adapter (Emergent object storage) before enabling
production file uploads. Current implementation stores metadata only."""
from abc import ABC, abstractmethod
from .database import now_iso


class StorageAdapter(ABC):
    @abstractmethod
    async def save(self, key: str, content: bytes, content_type: str) -> str: ...

    @abstractmethod
    async def url(self, key: str) -> str: ...


class PlaceholderStorage(StorageAdapter):
    """Metadata-only placeholder. Does not persist bytes yet."""

    async def save(self, key: str, content: bytes, content_type: str) -> str:
        return key

    async def url(self, key: str) -> str:
        return f"/placeholder/{key}"


def get_storage() -> StorageAdapter:
    return PlaceholderStorage()


def file_meta(filename: str, category: str, content_type: str = None):
    return {
        "filename": filename,
        "category": category,
        "content_type": content_type,
        "storage_pending": True,  # TODO: set to False once real storage is wired
        "uploaded_at": now_iso(),
    }
