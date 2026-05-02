FROM python:3.12-slim

# System deps for pillow-heif
RUN apt-get update && apt-get install -y --no-install-recommends \
    libheif1 \
    libde265-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

# Cloud Run sends SIGTERM; uvicorn handles it gracefully
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1
