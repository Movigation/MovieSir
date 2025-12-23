# MovieSir AI Service
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# torch GPU 버전 설치 (faiss-cpu는 유지)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu118

# AI 코드 복사
COPY . .

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]
