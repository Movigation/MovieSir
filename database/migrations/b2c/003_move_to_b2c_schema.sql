-- =============================================
-- MovieSir B2C 스키마 분리
-- 003: public → b2c 스키마 이동
-- 생성일: 2025-01-14
--
-- 주의: 이 마이그레이션은 이미 실행됨 (기록용)
-- =============================================

BEGIN;

-- B2C 스키마 생성
CREATE SCHEMA IF NOT EXISTS b2c;

-- =============================================
-- public → b2c 스키마로 테이블 이동 (8개)
-- =============================================

-- 1. users
ALTER TABLE public.users SET SCHEMA b2c;

-- 2. user_vectors
ALTER TABLE public.user_vectors SET SCHEMA b2c;

-- 3. user_ott_map
ALTER TABLE public.user_ott_map SET SCHEMA b2c;

-- 4. user_onboarding_answers
ALTER TABLE public.user_onboarding_answers SET SCHEMA b2c;

-- 5. user_movie_feedback
ALTER TABLE public.user_movie_feedback SET SCHEMA b2c;

-- 6. movie_logs
ALTER TABLE public.movie_logs SET SCHEMA b2c;

-- 7. recommendation_sessions
ALTER TABLE public.recommendation_sessions SET SCHEMA b2c;

-- 8. onboarding_candidates
ALTER TABLE public.onboarding_candidates SET SCHEMA b2c;

-- =============================================
-- public에 유지되는 테이블 (4개) - 공통 데이터
-- =============================================
-- movies, movie_vectors, movie_ott_map, ott_providers

-- =============================================
-- search_path 설정 (중요!)
-- =============================================
ALTER ROLE movigation SET search_path TO public, b2c, b2b;

COMMIT;
