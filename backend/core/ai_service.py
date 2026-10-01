"""AI service layer (architecture only for V1).

No automatic clinical decisions are made. These are placeholders behind an
abstraction so a provider (configured as GPT 6 Luna) can be wired later via
emergentintegrations. Every AI output must be verified by a clinician before it
becomes a definitive clinical record.

TODO: implement real LLM calls (model: GPT 6 Luna) using emergentintegrations
and the EMERGENT_LLM_KEY. Keep all prompts/outputs behind clinician approval."""

AI_ENABLED = False  # V1: disabled by design

CAPABILITIES = [
    "anamnesis_summary",
    "timeline_summary",
    "soap_draft",
    "wound_change_summary",
    "missing_data_check",
    "encounter_delta_summary",
]


async def generate(capability: str, context: dict) -> dict:
    """Returns a draft marked as unverified. Never a final clinical record."""
    return {
        "capability": capability,
        "enabled": AI_ENABLED,
        "status": "not_implemented",
        "requires_clinician_verification": True,
        "draft": None,
        "message": "AI servis katmanı hazır ancak V1'de devre dışı (TODO).",
    }
