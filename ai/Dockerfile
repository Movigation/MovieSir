# MovieSir AI Service
FROM python:3.11-slim

WORKDIR /app

# GPU 사용 여부 (default: true for production)
ARG USE_GPU=true

# 시스템 의존성
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# torch 설치 (GPU/CPU 분기)
RUN if [ "$USE_GPU" = "true" ] || [ "$USE_GPU" = "True" ]; then \
        pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu118; \
    else \
        pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu; \
    fi

# AI 코드 복사
COPY . .

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]
