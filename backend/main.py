import logging
import uuid
import time
import traceback
import io
import re
import xml.etree.ElementTree as ET
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
import contextvars

from fastapi import FastAPI, HTTPException, Header, status, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from groq import AsyncGroq
from cachetools import TTLCache
import motor.motor_asyncio
from minio import Minio

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")
    GROQ_API_KEY: str
    MONGODB_URI: str = "mongodb://localhost:27017"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "admin"
    MINIO_SECRET_KEY: str = "password123"
    MINIO_BUCKET: str = "workflows"
    LOG_LEVEL: str = "INFO"
    
settings = Settings()
request_id_context = contextvars.ContextVar("request_id", default="SYSTEM")

class CorrelationIdFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = request_id_context.get()
        return True

logger = logging.getLogger("enterprise.screening")
logger.setLevel(settings.LOG_LEVEL)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] [ReqID: %(correlation_id)s] %(name)s: %(message)s"))
logger.addHandler(handler)
logger.addFilter(CorrelationIdFilter())
logger.propagate = False 

class AppState:
    groq_client: Optional[AsyncGroq] = None
    mongo_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
    minio_client: Optional[Minio] = None
    db: Any = None
    session_cache: TTLCache = TTLCache(maxsize=5000, ttl=86400)

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing enterprise application state...")
    state.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    state.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    state.db = state.mongo_client.enterprise_screening
    
    state.minio_client = Minio(settings.MINIO_ENDPOINT, access_key=settings.MINIO_ACCESS_KEY, secret_key=settings.MINIO_SECRET_KEY, secure=False)
    
    try:
        await state.db.workflows.create_index("workflow_id", unique=True)
        if not state.minio_client.bucket_exists(settings.MINIO_BUCKET):
            state.minio_client.make_bucket(settings.MINIO_BUCKET)
    except Exception as e:
        logger.error(f"Failed to initialize databases: {e}")
    yield
    await state.groq_client.close()
    state.mongo_client.close()

app = FastAPI(title="Screening Engine API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def add_process_time_header_and_correlate(request: Request, call_next):
    req_id = str(uuid.uuid4())
    request_id_context.set(req_id)
    start_time = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time-Ms"] = str(round((time.time() - start_time) * 1000, 2))
    response.headers["X-Request-ID"] = req_id
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Server Exception: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": "An internal system error occurred."})

# --- AI XML Sanitization Engine ---
async def llm_sanitize_xml(raw_content: str, target_id: str) -> str:
    """Uses Groq to rigidly format incoming XML into our strict enterprise schema."""
    system_prompt = f"""You are an Enterprise XML Formatting Engine. 
Your job is to read raw, potentially broken, or unformatted XML/text and reconstruct it STRICTLY using only our allowed tags and attributes.

STRICT SCHEMA RULES:
1. Root Node: <workflow id="{target_id}" firstStepId="...">
2. Form Steps: <step id="..." type="form" next="...">
3. Allowed Form Fields: You MUST map inputs to one of three types: "string", "number", or "double".
   Format: <field id="..." type="string|number|double" label="[Question Text]" hint="[Help Text]" required="true|false" />
4. AI Steps: <step id="..." type="ai_screening" next="[fallback/default step]">
   - MUST contain: <model name="llama-3.1-8b-instant" />
   - MUST map variables: <map><input key="[AI_Feat_Name]" ref="[field_id_from_form]" /></map>
   - MUST contain: <fallback threshold="0.75" target="..." />
   - MUST route: <routing><branch when="[cond]" target="..." /></routing>
5. Outcomes: <outcome id="..." label="...">Text Description</outcome>

Fix any broken tags. Map custom variables to the strict enum types (string, number, double). 
OUTPUT ONLY THE FINAL RAW XML. DO NOT USE MARKDOWN BLOCKS (e.g. ```xml). DO NOT ADD EXPLANATIONS."""

    chat = await state.groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": raw_content}
        ],
        model="llama-3.1-8b-instant",
        temperature=0.1
    )
    
    # Strip markdown if the LLM hallucinates it
    xml_string = chat.choices[0].message.content.strip()
    xml_string = re.sub(r'^```xml', '', xml_string)
    xml_string = re.sub(r'```$', '', xml_string).strip()
    
    # Validation Gate: Ensure it doesn't crash the frontend parser
    try:
        ET.fromstring(xml_string)
    except ET.ParseError as e:
        raise ValueError(f"AI failed to generate structurally valid XML: {e}")
        
    return xml_string

# --- Schemas ---
class WorkflowUpload(BaseModel):
    workflow_id: str
    xml_content: str

class MidScreenEvalRequest(BaseModel):
    session_id: str
    model_name: str
    current_step_id: str
    step_inputs: Dict[str, Any]
    available_branches: List[str]

class GroqOutput(BaseModel):
    label: str
    confidence: float
    explanation: str

class MidScreenEvalResponse(BaseModel):
    session_id: str
    label: str = "unknown"
    confidence: float = 0.0
    fallback_triggered: bool = False
    explanation: Optional[str] = None
    error: Optional[str] = None

class ScreeningSubmission(BaseModel):
    submission_id: str
    session_id: str
    workflow_id: str
    final_outcome: str
    form_data: Dict[str, Any] = {}

class SubmissionResponse(BaseModel):
    status: str
    submission_id: str
    ai_synthesis: str

# --- Endpoints ---
@app.post("/api/v1/workflows")
async def upload_workflow(payload: WorkflowUpload):
    import datetime
    logger.info(f"Processing workflow upload: {payload.workflow_id}")
    
    try:
        # 1. AI Formatting Pipeline
        safe_xml = await llm_sanitize_xml(payload.xml_content, payload.workflow_id)
    except ValueError as e:
        logger.warning(f"Workflow rejected during AI sanitization: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    # 2. Push formatted XML to MinIO Object Storage
    xml_bytes = safe_xml.encode('utf-8')
    object_name = f"{payload.workflow_id}.xml"
    state.minio_client.put_object(
        settings.MINIO_BUCKET, object_name, io.BytesIO(xml_bytes), length=len(xml_bytes)
    )
    
    # 3. Save metadata to MongoDB Index
    document = {
        "workflow_id": payload.workflow_id,
        "minio_object_path": f"{settings.MINIO_BUCKET}/{object_name}",
        "updated_at": datetime.datetime.now(datetime.UTC)
    }
    await state.db.workflows.update_one({"workflow_id": payload.workflow_id}, {"$set": document}, upsert=True)
    
    return {"status": "success", "message": "Workflow formatted and stored in MinIO."}

@app.get("/api/v1/workflows")
async def list_workflows():
    cursor = state.db.workflows.find({}, {"_id": 0, "workflow_id": 1, "updated_at": 1}).sort("updated_at", -1)
    return {"workflows": await cursor.to_list(length=100)}

@app.get("/api/v1/workflows/{workflow_id}", response_class=Response)
async def get_workflow_xml(workflow_id: str):
    try:
        response = state.minio_client.get_object(settings.MINIO_BUCKET, f"{workflow_id}.xml")
        xml_content = response.read().decode('utf-8')
        response.close()
        response.release_conn()
        return Response(content=xml_content, media_type="application/xml")
    except Exception:
        raise HTTPException(status_code=404, detail="Workflow file not found in storage.")

@app.get("/api/v1/submissions")
async def list_submissions():
    cursor = state.db.submissions.find({}, {"_id": 0}).sort("timestamp", -1)
    return {"submissions": await cursor.to_list(length=100)}

@app.post("/api/v1/ai/mid-screen-eval", response_model=MidScreenEvalResponse)
async def evaluate_mid_screen(payload: MidScreenEvalRequest):
    try:
        merged_context = {**state.session_cache.get(payload.session_id, {}), **payload.step_inputs}
        state.session_cache[payload.session_id] = merged_context

        branch_rules = f"Strictly select exactly ONE of these labels: {payload.available_branches}." if payload.available_branches else "Select a logical label."
        chat = await state.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are a clinical AI. Return JSON with keys: 'label', 'confidence', 'explanation'. {branch_rules}"},
                {"role": "user", "content": f"Session Context: {merged_context}"}
            ],
            model="llama-3.1-8b-instant", 
            response_format={"type": "json_object"}
        )
        data = GroqOutput.model_validate_json(chat.choices[0].message.content)
        
        if payload.available_branches and data.label not in payload.available_branches:
            return MidScreenEvalResponse(session_id=payload.session_id, fallback_triggered=True, error="Hallucination mapping.")

        return MidScreenEvalResponse(session_id=payload.session_id, label=data.label, confidence=data.confidence, explanation=data.explanation)
    except Exception as e:
        return MidScreenEvalResponse(session_id=payload.session_id, fallback_triggered=True, error=str(e))

@app.post("/api/v1/submissions", response_model=SubmissionResponse)
async def finalize_submission(payload: ScreeningSubmission, idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key required")

    existing_record = await state.db.submissions.find_one({"submission_id": payload.submission_id})
    old_context = existing_record.get("collected_inputs", {}) if existing_record else {}
    final_context = {**old_context, **state.session_cache.get(payload.session_id, {}), **payload.form_data} 
    
    try:
        chat = await state.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Write a concise, professional 2-3 sentence medical handoff summary. Do not use markdown."},
                {"role": "user", "content": f"Final Status: {payload.final_outcome}\nTelemetry: {final_context}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.2 
        )
        ai_synthesis = chat.choices[0].message.content.strip()
    except Exception:
        ai_synthesis = "Data safely archived. AI synthesis generation unavailable."

    master_record = {
        **payload.model_dump(exclude={"form_data"}), 
        "collected_inputs": final_context, 
        "ai_summary": ai_synthesis,
        "timestamp": __import__("datetime").datetime.now(__import__("datetime").UTC)
    }
    
    await state.db.submissions.update_one({"submission_id": payload.submission_id}, {"$set": master_record}, upsert=True)
    state.session_cache.pop(payload.session_id, None)
    return {"status": "success", "submission_id": payload.submission_id, "ai_synthesis": ai_synthesis}