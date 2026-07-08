import logging
import uuid
import time
import traceback
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

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")
    GROQ_API_KEY: str
    MONGODB_URI: str = "mongodb://localhost:27017"
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
formatter = logging.Formatter("%(asctime)s [%(levelname)s] [ReqID: %(correlation_id)s] %(name)s: %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.addFilter(CorrelationIdFilter())
logger.propagate = False 

class AppState:
    groq_client: Optional[AsyncGroq] = None
    mongo_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
    db: Any = None
    session_cache: TTLCache = TTLCache(maxsize=5000, ttl=86400)

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing enterprise application state...")
    state.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    state.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
        settings.MONGODB_URI, 
        serverSelectionTimeoutMS=5000
    )
    state.db = state.mongo_client.enterprise_screening
    
    try:
        await state.db.workflows.create_index("workflow_id", unique=True)
        logger.info("Database indexes verified successfully.")
    except Exception as e:
        logger.error(f"Failed to verify database indexes: {e}")
        
    yield
    logger.info("Tearing down application state...")
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
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = str(round(process_time, 2))
    response.headers["X-Request-ID"] = req_id
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Server Exception: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal system error occurred. Please contact support with your Request ID."},
        headers={"X-Request-ID": request_id_context.get()}
    )

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

@app.post("/api/v1/workflows", status_code=status.HTTP_201_CREATED)
async def upload_workflow(payload: WorkflowUpload):
    import datetime
    document = {
        "workflow_id": payload.workflow_id,
        "xml_content": payload.xml_content,
        "updated_at": datetime.datetime.now(datetime.UTC)
    }
    await state.db.workflows.update_one({"workflow_id": payload.workflow_id}, {"$set": document}, upsert=True)
    return {"status": "success"}

@app.get("/api/v1/workflows")
async def list_workflows():
    cursor = state.db.workflows.find({}, {"_id": 0, "workflow_id": 1, "updated_at": 1}).sort("updated_at", -1)
    workflows = await cursor.to_list(length=100)
    return {"workflows": workflows}

@app.get("/api/v1/workflows/{workflow_id}", response_class=Response)
async def get_workflow_xml(workflow_id: str):
    workflow = await state.db.workflows.find_one({"workflow_id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found.")
    return Response(content=workflow["xml_content"], media_type="application/xml")

@app.get("/api/v1/submissions")
async def list_submissions():
    cursor = state.db.submissions.find({}, {"_id": 0}).sort("timestamp", -1)
    submissions = await cursor.to_list(length=100)
    return {"submissions": submissions}

@app.post("/api/v1/ai/mid-screen-eval", response_model=MidScreenEvalResponse)
async def evaluate_mid_screen(payload: MidScreenEvalRequest):
    try:
        history = state.session_cache.get(payload.session_id, {})
        merged_context = {**history, **payload.step_inputs}
        state.session_cache[payload.session_id] = merged_context

        branch_rules = f"You MUST strictly select exactly ONE of these labels: {payload.available_branches}." if payload.available_branches else "Select a logical snake_case label."
        chat = await state.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are a clinical AI. Return JSON with keys: 'label' (string), 'confidence' (float), 'explanation' (string). {branch_rules}"},
                {"role": "user", "content": f"Session Context: {merged_context}"}
            ],
            model="llama-3.1-8b-instant", 
            response_format={"type": "json_object"}
        )
        data = GroqOutput.model_validate_json(chat.choices[0].message.content)
        
        if payload.available_branches and data.label not in payload.available_branches:
            return MidScreenEvalResponse(session_id=payload.session_id, fallback_triggered=True, error="AI hallucinated branch mapping.")

        return MidScreenEvalResponse(session_id=payload.session_id, label=data.label, confidence=data.confidence, explanation=data.explanation)
    except Exception as e:
        logger.error(f"Inference pipeline crashed: {str(e)}", exc_info=True)
        return MidScreenEvalResponse(session_id=payload.session_id, fallback_triggered=True, error=str(e))

@app.post("/api/v1/submissions", response_model=SubmissionResponse)
async def finalize_submission(payload: ScreeningSubmission, idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key required")

    existing_record = await state.db.submissions.find_one({"submission_id": payload.submission_id})
    old_context = existing_record.get("collected_inputs", {}) if existing_record else {}
    
    new_session_context = state.session_cache.get(payload.session_id, {})
    
    final_context = {**old_context, **new_session_context, **payload.form_data} 
    
    try:
        chat = await state.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Write a concise, highly professional 2-3 sentence medical handoff summary. Do not use markdown."},
                {"role": "user", "content": f"Final Status: {payload.final_outcome}\nTelemetry: {final_context}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.2 
        )
        ai_synthesis = chat.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Final synthesis generation failed: {e}")
        ai_synthesis = "Data safely archived. Network constraints prevented live AI synthesis generation."

    master_record = {
        **payload.model_dump(exclude={"form_data"}), 
        "collected_inputs": final_context, 
        "ai_summary": ai_synthesis,
        "timestamp": __import__("datetime").datetime.now(__import__("datetime").UTC)
    }
    
    await state.db.submissions.update_one(
        {"submission_id": payload.submission_id},
        {"$set": master_record},
        upsert=True
    )
    
    state.session_cache.pop(payload.session_id, None)
    return {"status": "success", "submission_id": payload.submission_id, "ai_synthesis": ai_synthesis}