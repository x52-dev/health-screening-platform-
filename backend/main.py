import logging
import uuid
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException, Header, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from groq import AsyncGroq
from cachetools import TTLCache

# --- Configuration & State ---
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")
    GROQ_API_KEY: str
    
settings = Settings()
logger = logging.getLogger("enterprise.screening")

class AppState:
    groq_client: Optional[AsyncGroq] = None
    session_cache: TTLCache = TTLCache(maxsize=5000, ttl=86400) # 24hr stateful memory
    db: Dict[str, Any] = {}

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    state.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    yield
    await state.groq_client.close()

app = FastAPI(title="Screening Engine API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- Schemas ---
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

class SubmissionResponse(BaseModel):
    status: str
    submission_id: str
    ai_synthesis: str

# --- Endpoints ---

@app.post("/api/v1/ai/mid-screen-eval", response_model=MidScreenEvalResponse)
async def evaluate_mid_screen(payload: MidScreenEvalRequest):
    try:
        history = state.session_cache.get(payload.session_id, {})
        merged_context = {**history, **payload.step_inputs}
        state.session_cache[payload.session_id] = merged_context

        branch_rules = f"You MUST strictly select exactly ONE of these labels: {payload.available_branches}." if payload.available_branches else "Select a logical snake_case label."
        actual_inference_model = "llama-3.1-8b-instant"

        chat = await state.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are a clinical AI. Return JSON with keys: 'label' (string), 'confidence' (float), 'explanation' (string). {branch_rules}"},
                {"role": "user", "content": f"Session Context: {merged_context}"}
            ],
            model=actual_inference_model, 
            response_format={"type": "json_object"}
        )
        
        data = GroqOutput.model_validate_json(chat.choices[0].message.content)
        
        if payload.available_branches and data.label not in payload.available_branches:
            return MidScreenEvalResponse(session_id=payload.session_id, fallback_triggered=True, error="AI hallucinated branch mapping.")

        return MidScreenEvalResponse(session_id=payload.session_id, label=data.label, confidence=data.confidence, explanation=data.explanation)
    except Exception as e:
        logger.error(f"Inference failed: {e}")
        return MidScreenEvalResponse(session_id=payload.session_id, fallback_triggered=True, error=str(e))

@app.post("/api/v1/submissions", response_model=SubmissionResponse)
async def finalize_submission(payload: ScreeningSubmission, idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")):
    """API 2: Merges session history, triggers final AI summary, and commits to database."""
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key required")

    final_context = state.session_cache.get(payload.session_id, {})
    
    # --- NEW: AI Clinical Synthesis Generation ---
    try:
        system_prompt = (
            "You are an expert clinical AI assistant. Based on the provided patient telemetry and final routing status, "
            "write a concise, highly professional 2-3 sentence medical handoff summary. Do not use markdown. "
            "State the facts clearly for the attending physician."
        )
        user_prompt = f"Final Triage Status: {payload.final_outcome}\nPatient Telemetry: {final_context}"
        
        chat = await state.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.2 # Low temperature for clinical factuality
        )
        ai_synthesis = chat.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Final synthesis generation failed: {e}")
        ai_synthesis = "Data safely archived. Network constraints prevented live AI synthesis generation."

    # Bundle the master record
    master_record = {**payload.model_dump(), "collected_inputs": final_context, "ai_summary": ai_synthesis}
    state.db[payload.submission_id] = master_record
    
    return {"status": "success", "submission_id": payload.submission_id, "ai_synthesis": ai_synthesis}