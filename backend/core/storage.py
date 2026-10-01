"""File-storage abstraction. Real adapter = Emergent object storage, kept behind
StorageAdapter so it can be swapped (S3/GCS/own server) with no business-logic change."""
import os
from abc import ABC, abstractmethod
import requests
from .database import now_iso

APP_NAME = "hbot-clinic"
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "webp": "image/webp", "pdf": "application/pdf", "txt": "text/plain", "csv": "text/csv",
}


class StorageAdapter(ABC):
    @abstractmethod
    def save(self, path: str, data: bytes, content_type: str) -> dict: ...
    @abstractmethod
    def load(self, path: str): ...


class EmergentObjectStorage(StorageAdapter):
    _key = None

    def _init(self, force=False):
        if self._key and not force:
            return self._key
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        EmergentObjectStorage._key = resp.json()["storage_key"]
        return self._key

    def save(self, path: str, data: bytes, content_type: str) -> dict:
        key = self._init()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
        if resp.status_code == 404:
            key = self._init(force=True)
            resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                                headers={"X-Storage-Key": key, "Content-Type": content_type},
                                data=data, timeout=120)
        resp.raise_for_status()
        return resp.json()

    def load(self, path: str):
        key = self._init()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
        if resp.status_code == 404:
            key = self._init(force=True)
            resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


_storage = EmergentObjectStorage()


def get_storage() -> StorageAdapter:
    return _storage


def init_storage():
    return _storage._init()


def mime_for(filename: str, fallback="application/octet-stream") -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return MIME_TYPES.get(ext, fallback)
