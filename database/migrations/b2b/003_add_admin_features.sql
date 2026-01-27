-- =============================================
-- MovieSir B2B 어드민 기능 추가
-- 003: B2C 유저 관리를 위한 is_admin 컬럼 추가
-- 생성일: 2025-01-22
-- 수정일: 2025-01-23 (미사용 테이블/컬럼 제거)
-- =============================================

BEGIN;

-- =============================================
-- 1. companies 테이블 수정 (is_admin 추가)
-- =============================================
-- B2C 유저 관리 권한을 가진 어드민 계정 구분용
ALTER TABLE b2b.companies ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- =============================================
-- 2. 어드민 계정 설정 (수동)
-- =============================================
-- 회원가입 후 DB에서 직접 설정:
-- UPDATE b2b.companies SET is_admin = TRUE WHERE manager_email = 'admin@moviesir.cloud';

COMMIT;

-- =============================================
-- 적용 확인 쿼리
-- =============================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'b2b' AND table_name = 'companies' AND column_name = 'is_admin';
