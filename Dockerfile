# Start from official Python slim
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Prevent Python from writing pyc and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies and wait tool
RUN apt-get update && apt-get install -y gcc libpq-dev curl && rm -rf /var/lib/apt/lists/*

# Copy requirements first (cacheable)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files (flat structure)
COPY . .

# Expose FastAPI port
EXPOSE 8000

RUN apt-get update && \
    apt-get install -y gcc libpq-dev netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*
CMD bash -c 'until nc -z db 5432; do echo "Postgres not ready, sleeping 2s..."; sleep 2; done; uvicorn main:app --host 0.0.0.0 --port 8000 --reload'
