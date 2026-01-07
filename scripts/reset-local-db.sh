#!/bin/bash
# MovieSir 로컬 PostgreSQL 데이터베이스 재구성 스크립트 (macOS 전용)
# Usage: ./scripts/reset-local-db.sh

echo "🔄 PostgreSQL 데이터베이스 재구성 시작..."

# macOS 사용자 이름 확인
SUPERUSER="apple"
DB_USER="movigation"
DB_NAME="moviesir"
SQL_FILE="database/init/movigation_full_backup.sql"

# 1. 백업 (선택사항)
# echo "📦 기존 데이터베이스 백업 중..."
# pg_dump -U $DB_USER -d $DB_NAME > ~/moviesir_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null && echo "✅ 백업 완료: ~/moviesir_backup_$(date +%Y%m%d_%H%M%S).sql" || echo "⚠️  백업 스킵 (데이터베이스가 없거나 접근 불가)"

# 2. 기존 연결 종료
echo "🔌 기존 데이터베이스 연결 종료 중..."
psql -U $SUPERUSER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null

# 3. 기존 데이터베이스 삭제 및 재생성
echo "🗑️  기존 데이터베이스 삭제 및 재생성..."
psql -U $SUPERUSER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -U $SUPERUSER -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# 4. pgvector 확장 설치 (슈퍼유저 권한 필요)
echo "🔧 pgvector 확장 설치..."
psql -U $SUPERUSER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 5. 새 SQL 파일 적용
echo "📥 새 SQL 파일 적용 중... (수 분 소요될 수 있습니다)"
psql -U $DB_USER -d $DB_NAME -f $SQL_FILE > /tmp/sql_import.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ SQL 파일 적용 완료"
else
    echo "⚠️  SQL 파일 적용 완료 (일부 경고 있음 - /tmp/sql_import.log 확인)"
fi

# 6. 확인
echo ""
echo "✅ 테이블 목록:"
psql -U $DB_USER -d $DB_NAME -c "\dt"

echo ""
echo "✅ user_movie_feedback 테이블 확인:"
psql -U $DB_USER -d $DB_NAME -c "\d user_movie_feedback"

echo ""
echo "✅ 데이터 개수:"
psql -U $DB_USER -d $DB_NAME -c "SELECT
    (SELECT COUNT(*) FROM movies) as movies,
    (SELECT COUNT(*) FROM movie_vectors) as vectors,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM ott_providers) as otts;"

echo ""
echo "✅ movie_clicks 테이블 제거 확인 (에러가 나와야 정상):"
psql -U $DB_USER -d $DB_NAME -c "\d movie_clicks" 2>&1 | grep "없음" && echo "✅ movie_clicks 테이블 성공적으로 제거됨" || echo "⚠️  movie_clicks가 아직 존재합니다"

echo ""
echo "🎉 데이터베이스 재구성 완료!"
echo ""
echo "📝 다음 단계:"
echo "   1. backend 서버 재시작 필요 (uvicorn 재실행)"
echo "   2. ai 서버 재시작 필요 (uvicorn 재실행)"
echo "   3. backend 코드 수정 필요 (MovieClick → UserMovieFeedback)"
