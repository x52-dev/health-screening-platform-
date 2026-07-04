FROM python:3.11-slim

WORKDIR /app

# 1. Copy ONLY the requirements file first (Best practice for Docker caching)
COPY requirements.txt .

# 2. Tell pip to install exactly what is in that file
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy the rest of your code
COPY . .

# Expose the API port
EXPOSE 8000

# Run Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]