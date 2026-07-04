import os
import uuid
import logging
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Header, Response, status, Depends
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from groq import AsyncGroq
from cachetools import TTLCache
from dotenv import load_dotenv

# Enterprise Logging: Structured for observability
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("enterprise.screening")

# Config Loading
load_dotenv(dotenv_path="../.env")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI(title="Enterprise Screening API", version="2.0.0")

# CORS and Compression
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=500)

# Resilient State Management
groq_client = AsyncGroq(api_key=GROQ_API_KEY)
IDEMPOTENCY_CACHE = TTLCache(maxsize=5000, ttl=3600)

# Models
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

@app.post("/api/v1/ai/screen", response_model=AIResponse)
async def screen_patient(payload: AIRequest):
    try:
        # LLM Logic with System Prompt Engineering
        chat = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Return ONLY valid JSON with keys: label (string), confidence (float), explanation (string)."},
                {"role": "user", "content": f"Assess: {payload.inputs}"}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        
        data = GroqOutput.model_validate_json(chat.choices[0].message.content)
        return AIResponse(label=data.label, confidence=data.confidence, explanation=data.explanation)

    except Exception as e:
        logger.error(f"Inference failed: {str(e)}")
        return AIResponse(fallback_triggered=True, error="Service Unavailable")