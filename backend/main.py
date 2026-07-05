import os
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Header, Response, status, Depends
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, ValidationError
from groq import AsyncGroq
from cachetools import TTLCache
from dotenv import load_dotenv

# Enterprise Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("enterprise.screening")

load_dotenv(dotenv_path="../.env")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI(title="Enterprise Screening API", version="2.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=500)

groq_client = AsyncGroq(api_key=GROQ_API_KEY)

# Caches for local setup
IDEMPOTENCY_CACHE = TTLCache(maxsize=5000, ttl=3600)
SUBMISSION_DB = {}  # In-memory mock database for outcomes

# Local Directory for XML Workflows
WORKFLOWS_DIR = Path("../workflows")

# --- Schemas ---

class AIRequest(BaseModel):
    model_name: str
    version_constraint: str = "*"
    inputs: Dict[str, Any]

class GroqOutput(BaseModel):
    label: str
    confidence: float
    explanation: str

class AIResponse(BaseModel):
    label: str = "unknown"
    confidence: float = 0.0
    fallback_triggered: bool = False
    explanation: Optional[str] = None
    error: Optional[str] = None

class ScreeningSubmission(BaseModel):
    submission_id: str
    workflow_id: str
    collected_inputs: Dict[str, Any]
    ai_evaluations: List[Dict[str, Any]]
    final_outcome: str


# --- Endpoints ---

@app.get("/api/v1/workflows/{workflow_id}", response_class=Response)
async def get_workflow(workflow_id: str):
    """
    Serves the XML workflow definitions dynamically to the generic frontend renderer.
    Enables shifting screening behavior (Scenario A vs Scenario B) without code changes.
    """
    # Ensure safe file paths to prevent directory traversal vulnerabilities
    safe_name = f"{Path(workflow_id).stem}.xml"
    file_path = WORKFLOWS_DIR / safe_name

    if not file_path.exists():
        logger.warning(f"Workflow file not found: {file_path}")
        raise HTTPException(status_code=404, detail="Workflow configuration not found")
    
    try:
        xml_content = file_path.read_text(encoding="utf-8")
        return Response(content=xml_content, media_type="application/xml")
    except Exception as e:
        logger.error(f"Failed to read workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error reading workflow mapping")


@app.post("/api/v1/ai/screen", response_model=AIResponse)
async def screen_patient(payload: AIRequest):
    """
    Executes a mid-workflow or step-specific AI evaluation. 
    Accepts arbitrary inputs dictionary, fitting multi-step forms effortlessly.
    """
    try:
        chat = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Return ONLY valid JSON with keys: label (string), confidence (float), explanation (string). Ensure label coordinates cleanly with branching expressions (e.g. 'high_risk', 'low_risk', 'anemic')."},
                {"role": "user", "content": f"Assess inputs for model {payload.model_name} (v{payload.version_constraint}): {payload.inputs}"}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        
        data = GroqOutput.model_validate_json(chat.choices[0].message.content)
        return AIResponse(label=data.label, confidence=data.confidence, explanation=data.explanation)

    except Exception as e:
        logger.error(f"Inference failed: {str(e)}")
        # Gracefully handle unhappy path using standard fallback metadata
        return AIResponse(fallback_triggered=True, error=f"Inference failure: {str(e)}")


@app.post("/api/v1/submissions", status_code=status.HTTP_201_CREATED)
async def submit_screening_outcome(
    payload: ScreeningSubmission, 
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Persists final screening records. Inspects the 'Idempotency-Key' HTTP header,
    with an automatic fallback to payload.submission_id if custom headers are 
    stripped or ignored by frontend apiClient utilities.
    """
    # Bulletproof fallback: use submission_id if HTTP header is missing
    key_to_check = idempotency_key or payload.submission_id

    if not key_to_check:
        raise HTTPException(
            status_code=400, 
            detail="Missing network resilience tokens. An idempotency key is required."
        )

    # Check if this exact screening session has already been recorded successfully
    if key_to_check in IDEMPOTENCY_CACHE:
        logger.info(f"Idempotency cache hit for key: {key_to_check}. De-duplicating request.")
        return IDEMPOTENCY_CACHE[key_to_check]

    try:
        # Save payload to our in-memory data store
        SUBMISSION_DB[payload.submission_id] = payload.model_dump()
        logger.info(f"Successfully archived unique screening submission: {payload.submission_id}")

        response_payload = {
            "status": "success",
            "submission_id": payload.submission_id,
            "message": "Screening outcome successfully archived"
        }
        
        # Hydrate the deduplication cache layer
        IDEMPOTENCY_CACHE[key_to_check] = response_payload
        return response_payload

    except Exception as e:
        logger.error(f"Submission pipeline failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Persistence error saving multi-step outcome")
    """
    Persists final screening records. Uses an Idempotency-Key header 
    to absorb duplicate retries over shaky field networks without spawning multi-records.
    """
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header required for network resilience")

    # Check if this exact payload request was already processed successfully
    if idempotency_key in IDEMPOTENCY_CACHE:
        logger.info(f"Idempotency cache hit for key: {idempotency_key}. Returning cached response state.")
        return IDEMPOTENCY_CACHE[idempotency_key]

    try:
        # Mocking persistence logic 
        SUBMISSION_DB[payload.submission_id] = payload.model_dump()
        logger.info(f"Successfully persisted screening submission {payload.submission_id}")

        response_payload = {
            "status": "success",
            "submission_id": payload.submission_id,
            "message": "Screening outcome successfully archived"
        }
        
        # Hydrate cache with response
        IDEMPOTENCY_CACHE[idempotency_key] = response_payload
        return response_payload

    except Exception as e:
        logger.error(f"Submission pipeline failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Persistence error saving multi-step outcome")