#!/bin/bash
# MovieSir 로컬 개발 환경 시작 스크립트

set -e

echo "=========================================="
echo "MovieSir 로컬 개발 환경 시작"
echo "=========================================="

# Docker Compose 시작
echo ""
echo "[1/2] Docker 컨테이너 시작 중..."
docker compose -f docker-compose.local.yml up -d --build

# DB 준비 대기 (프로덕션 덤프 로드에 시간 소요)
echo ""
echo "[2/2] 데이터베이스 초기화 대기 중..."
echo "      (첫 실행 시 172MB 데이터 로드로 1-2분 소요)"
sleep 30

# 헬스체크
echo ""
echo "서비스 상태 확인 중..."
docker compose -f docker-compose.local.yml ps

echo ""
echo "=========================================="
echo "완료! 서비스 접속 정보:"
echo "=========================================="
echo "Frontend:   http://localhost:3000"
echo "Backend:    http://localhost:8000"
echo "AI Service: http://localhost:8001"
echo "PostgreSQL: localhost:5433 (user: moviesir / pw: moviesir123)"
echo "Redis:      localhost:6380"
echo "=========================================="
echo ""
echo "※ DB 데이터: 프로덕션 덤프 자동 로드 (database/init/movigation.sql)"
echo "=========================================="
