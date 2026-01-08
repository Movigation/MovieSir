-- =============================================
-- MovieSir B2C 마이그레이션
-- 002: 스키마 변경 (movigation_2 → movigation_1)
-- 생성일: 2025-01-08
-- =============================================

BEGIN;

-- 1. movie_clicks → user_movie_feedback 테이블 교체
DROP TABLE IF EXISTS movie_clicks;

CREATE TABLE IF NOT EXISTS user_movie_feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    movie_id INTEGER NOT NULL,
    session_id BIGINT,
    feedback_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_movie_feedback_user_id ON user_movie_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_movie_feedback_session_id ON user_movie_feedback(session_id);

-- 2. movie_ott_map에 payment_type 컬럼 추가
ALTER TABLE movie_ott_map
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) NOT NULL DEFAULT 'FLATRATE';

COMMIT;
