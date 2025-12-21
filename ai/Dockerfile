# MovieSir AI Service
FROM python:3.11-slim

WORKDIR /app

# GPU 모드 설정 (기본값: true)
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

# GPU/CPU 모드에 따라 패키지 설치
RUN if [ "$USE_GPU" = "true" ]; then \
        pip uninstall -y faiss-cpu && \
        pip install --no-cache-dir faiss-gpu && \
        pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu118; \
    else \
        pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu; \
    fi

# AI 코드 복사
COPY . .

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]
