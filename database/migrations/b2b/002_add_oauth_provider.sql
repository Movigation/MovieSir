-- =============================================
-- MovieSir B2B 마이그레이션
-- 001: OAuth provider 컬럼 추가
-- 생성일: 2025-01-14
-- =============================================

BEGIN;

-- companies 테이블에 oauth_provider 컬럼 추가
-- google, github 등 소셜 로그인 제공자 저장
ALTER TABLE b2b.companies
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20);

COMMENT ON COLUMN b2b.companies.oauth_provider IS '소셜 로그인 제공자 (google, github)';

COMMIT;
