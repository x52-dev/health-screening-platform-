#!/bin/bash

# 1. Provide clear feedback
echo "🚀 Initializing Edge Screening Platform..."

# 2. Ensure we have the .env file (essential for the backend)
if [ ! -f .env ]; then
  echo "⚠️  .env file missing. Creating a default for local mock usage..."
  echo "GROQ_API_KEY=not_set" > .env
  echo "VITE_API_BASE_URL=http://localhost:8000" >> .env
fi

# 3. Clean up existing containers to prevent port conflicts
echo "🧹 Cleaning up existing containers..."
docker compose down --remove-orphans

# 4. Perform a fresh build and run
echo "🏗 Building and starting containers..."
docker compose up --build -d

# 5. Output ready state
echo "--------------------------------------------------------"
echo "✅ Everything is live!"
echo "🌐 Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo "To stop: ./run.sh stop"
echo "--------------------------------------------------------"