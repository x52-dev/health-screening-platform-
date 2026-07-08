#!/bin/bash

# ==========================================
# 1. GHOST SWEEPER (NEW!)
# ==========================================
echo "🧹 Sweeping ports for ghost processes..."
# This finds whatever is running on 8000 and 5173 and force-kills it silently
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# ==========================================
# 2. PROCESS CLEANUP (Catches CTRL+C)
# ==========================================
trap 'echo -e "\n\n🛑 Shutting down Enterprise Gateway..."; kill $(jobs -p) 2>/dev/null; exit' SIGINT SIGTERM

echo "🚀 Initializing Enterprise Screening Environment..."

# ==========================================
# 3. DOCKER HEALTH CHECK (FAIL-SAFE)
# ==========================================
echo "🐳 Checking Docker health..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ FATAL: Docker is not running!"
    echo "💡 FIX: Please open the 'Docker Desktop' app on your Mac, wait for it to start, and run this script again."
    exit 1
fi

# ==========================================
# 4. START DATABASE (MONGO)
# ==========================================
echo "🗄️  Verifying MongoDB..."
if ! docker ps | grep -q enterprise-mongo; then
    echo "   Starting MongoDB container..."
    docker start enterprise-mongo 2>/dev/null || docker run --name enterprise-mongo -p 27017:27017 -d mongo:latest
else
    echo "   MongoDB is already running."
fi

# ==========================================
# 5. START BACKEND
# ==========================================
echo "⚙️  Starting FastAPI Backend (Port 8000)..."
cd backend
pip install -q fastapi uvicorn groq cachetools pydantic pydantic-settings motor
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
cd ..

# ==========================================
# 6. START FRONTEND
# ==========================================
echo "🖥️  Starting Vite Frontend (Port 5173)..."
cd frontend
npm install --silent
npm run dev &
cd ..

# ==========================================
# 7. READY STATE
# ==========================================
echo "========================================================"
echo "✅ Enterprise Gateway is LIVE!"
echo "🌐 Frontend UI: http://localhost:5173"
echo "🧠 Backend API: http://localhost:8000/docs"
echo "👀 Watching live data flow below. Press [CTRL+C] to stop."
echo "========================================================"

wait