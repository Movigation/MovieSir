#!/bin/bash
# ============================================================
# MovieSir 로컬 환경 셋업 스크립트
# ============================================================
# 사용법: ./scripts/setup-local.sh
# ============================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN} MovieSir 로컬 환경 셋업${NC}"
echo -e "${GREEN}============================================================${NC}"

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo -e "\n${YELLOW}[1/5] SQL 파일 확인${NC}"
SQL_FILE="$PROJECT_ROOT/database/init/movigation_2.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ SQL 파일이 없습니다: $SQL_FILE${NC}"
    echo ""
    echo "SQL 파일을 다운로드해주세요:"
    echo ""
    echo "  1. 아래 링크에서 movigation_2.sql 다운로드"
    echo "     https://drive.google.com/drive/folders/1mPbfGbdbMoxBIR7w0HuMHFaFjkM9zbYa"
    echo ""
    echo "  2. 다운로드한 파일을 database/init/ 폴더에 저장"
    echo "     mv ~/Downloads/movigation_2.sql ./database/init/"
    echo ""
    exit 1
fi

SQL_SIZE=$(du -h "$SQL_FILE" | cut -f1)
echo -e "${GREEN}✅ SQL 파일 확인됨: $SQL_SIZE${NC}"

echo -e "\n${YELLOW}[2/5] 기존 컨테이너/볼륨 정리${NC}"
read -p "기존 데이터를 삭제하고 새로 시작할까요? (y/N): " CLEAN_START
if [ "$CLEAN_START" = "y" ] || [ "$CLEAN_START" = "Y" ]; then
    echo "기존 컨테이너 중지..."
    docker compose -f docker-compose.local.yml down -v 2>/dev/null || true
    echo -e "${GREEN}✅ 정리 완료${NC}"
else
    echo "기존 데이터 유지"
    docker compose -f docker-compose.local.yml down 2>/dev/null || true
fi

echo -e "\n${YELLOW}[3/5] Docker 이미지 빌드 및 컨테이너 시작${NC}"
echo "⏳ AI 이미지 첫 빌드 시 10-15분 소요될 수 있습니다..."
docker compose -f docker-compose.local.yml --env-file .env.local up -d --build

echo -e "\n${YELLOW}[4/5] 서비스 상태 확인 중...${NC}"

# DB 준비 대기
echo -n "DB 준비 대기"
for i in {1..30}; do
    if docker exec moviesir-db-local pg_isready -U movigation -d moviesir >/dev/null 2>&1; then
        echo -e "\n${GREEN}✅ DB 준비 완료${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Backend 준비 대기
echo -n "Backend 준비 대기"
for i in {1..30}; do
    if curl -sf http://localhost:8000/ >/dev/null 2>&1; then
        echo -e "\n${GREEN}✅ Backend 준비 완료${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# AI 준비 대기
echo -n "AI 서비스 준비 대기 (시간이 걸릴 수 있음)"
for i in {1..60}; do
    if curl -sf http://localhost:8001/health >/dev/null 2>&1; then
        echo -e "\n${GREEN}✅ AI 서비스 준비 완료${NC}"
        break
    fi
    echo -n "."
    sleep 3
done

# Frontend 준비 대기
echo -n "Frontend 준비 대기"
for i in {1..20}; do
    if curl -sf http://localhost:3000/ >/dev/null 2>&1; then
        echo -e "\n${GREEN}✅ Frontend 준비 완료${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo -e "\n${YELLOW}[5/5] 최종 상태 확인${NC}"
docker compose -f docker-compose.local.yml ps

echo -e "\n${GREEN}============================================================${NC}"
echo -e "${GREEN} 셋업 완료!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "🌐 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:8000"
echo "🤖 AI:        http://localhost:8001"
echo "🗄️  DB:        localhost:5433 (movigation/movigation123)"
echo "📦 Redis:     localhost:6380"
echo ""
echo "로그 확인:"
echo "  docker compose -f docker-compose.local.yml logs -f"
echo ""
echo "중지:"
echo "  docker compose -f docker-compose.local.yml down"
echo ""
