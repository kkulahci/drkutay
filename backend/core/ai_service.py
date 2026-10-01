"""AI service layer. Model: GPT 6 Luna via emergentintegrations + EMERGENT_LLM_KEY.
Clinical-decision-support ONLY: every output is a DRAFT that requires clinician
verification and never becomes a definitive clinical record on its own."""
import os
import uuid
from emergentintegrations.llm.chat import LlmChat, UserMessage

AI_ENABLED = True
MODEL_PROVIDER = "openai"
MODEL_NAME = "gpt-6-luna"

CAPABILITIES = {
    "anamnesis_summary": "Anamnez Özeti",
    "timeline_summary": "Hasta Timeline Özeti",
    "soap_draft": "SOAP Taslağı",
    "wound_change_summary": "Yara Değişim Özeti",
    "missing_data_check": "Eksik Veri Kontrolü",
    "encounter_delta_summary": "Önceki Muayeneye Göre Değişiklik",
}

SYSTEM = (
    "Sen bir HBOT (hiperbarik oksijen) ve kronik yara kliniğinde çalışan sağlık "
    "profesyonellerine yardımcı olan bir klinik dokümantasyon asistanısın. "
    "Görevin yalnızca mevcut kayıtları özetlemek ve taslak metin hazırlamaktır. "
    "ASLA kesin tanı koyma, kesin kontrendikasyon kararı verme veya tedaviye 'yapılamaz/yapılır' "
    "şeklinde nihai karar üretme. Uydurma ICD/SUT kuralı veya olmayan veri ekleme. "
    "Çıktıların bir TASLAKTIR ve yetkili hekim tarafından doğrulanmadan kesin klinik kayıt olamaz. "
    "Türkçe, kısa, madde işaretli ve profesyonel yaz."
)

PROMPTS = {
    "anamnesis_summary": "Aşağıdaki anamnez verilerini kısa bir klinik özete dönüştür:",
    "timeline_summary": "Aşağıdaki hasta zaman çizelgesini kronolojik, özlü bir klinik özete dönüştür:",
    "soap_draft": "Aşağıdaki hasta verilerinden SOAP (Subjektif, Objektif, Değerlendirme, Plan) formatında bir TASLAK rapor hazırla:",
    "wound_change_summary": "Aşağıdaki yara değerlendirmelerinin zaman içindeki ölçümsel değişimini özetle (klinik iyileşme kararı verme):",
    "missing_data_check": "Aşağıdaki hasta verilerini incele ve klinik dokümantasyon açısından eksik olabilecek alanları listele:",
    "encounter_delta_summary": "Aşağıdaki ardışık muayene kayıtlarını karşılaştırıp önemli değişiklikleri özetle:",
}


async def generate(capability: str, context: dict) -> dict:
    out = {"capability": capability, "enabled": AI_ENABLED, "requires_clinician_verification": True, "draft": None}
    if capability not in CAPABILITIES:
        out.update({"status": "error", "message": "Bilinmeyen yetenek"})
        return out
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        out.update({"status": "error", "message": "LLM anahtarı yapılandırılmamış"})
        return out
    try:
        chat = LlmChat(api_key=key, session_id=f"hbot-{capability}-{uuid.uuid4().hex[:8]}",
                       system_message=SYSTEM).with_model(MODEL_PROVIDER, MODEL_NAME)
        prompt = f"{PROMPTS[capability]}\n\n{context.get('content', '')}"
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else getattr(resp, "content", str(resp))
        out.update({"status": "ok", "draft": text,
                    "disclaimer": "Bu bir AI taslağıdır. Yetkili hekim doğrulamadan kesin klinik kayıt değildir."})
    except Exception as e:
        out.update({"status": "error", "message": f"AI hatası: {e}"})
    return out
