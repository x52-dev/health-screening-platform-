#!/bin/bash

# ==========================================
# 1. GHOST SWEEPER 
# ==========================================
echo "🧹 Sweeping ports for ghost processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:9000 | xargs kill -9 2>/dev/null
lsof -ti:9001 | xargs kill -9 2>/dev/null

# ==========================================
# 2. PROCESS CLEANUP 
# ==========================================
trap 'echo -e "\n\n🛑 Shutting down Enterprise Gateway..."; kill $(jobs -p) 2>/dev/null; exit' SIGINT SIGTERM

echo "🚀 Initializing Enterprise Screening Environment..."

# ==========================================
# 3. DOCKER HEALTH CHECK
# ==========================================
echo "🐳 Checking Docker health..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ FATAL: Docker is not running!"
    echo "💡 FIX: Please press Cmd + Space, open 'Docker Desktop', wait 15 seconds, and run this script again."
    exit 1
fi

# ==========================================
# 4. START DATABASES (MONGO & MINIO)
# ==========================================
echo "🗄️  Verifying MongoDB..."
if ! docker ps | grep -q enterprise-mongo; then
    docker start enterprise-mongo 2>/dev/null || docker run --name enterprise-mongo -p 27017:27017 -d mongo:latest
fi

echo "🪣  Verifying MinIO (S3 Storage)..."
if ! docker ps | grep -q enterprise-minio; then
    docker start enterprise-minio 2>/dev/null || docker run --name enterprise-minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=admin -e MINIO_ROOT_PASSWORD=password123 -d minio/minio server /data --console-address ":9001"
fi

# ==========================================
# 5. START BACKEND
# ==========================================
echo "⚙️  Starting FastAPI Backend (Port 8000)..."
cd backend
# Added 'minio' to the python dependencies
pip install -q fastapi uvicorn groq cachetools pydantic pydantic-settings motor minio
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
echo "🪣 MinIO Dashboard: http://localhost:9001 (admin / password123)"
echo "👀 Watching live data flow below. Press [CTRL+C] to stop."
echo "========================================================"

wait