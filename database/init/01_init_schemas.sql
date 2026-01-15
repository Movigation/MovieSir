-- MovieSir Local Development - Schema Initialization
-- 로컬 개발 환경용 초기 스키마 설정
-- 1. 스키마 생성
CREATE SCHEMA IF NOT EXISTS b2c;
CREATE SCHEMA IF NOT EXISTS b2b;
-- 2. 검색 경로 설정
ALTER ROLE movigation
SET search_path TO public,
    b2c,
    b2b;
-- 3. pgvector 확장 설치
CREATE EXTENSION IF NOT EXISTS vector;
-- ============================================================
-- B2B 스키마 테이블
-- ============================================================
-- companies 테이블 (기업 고객)
CREATE TABLE IF NOT EXISTS b2b.companies (
    company_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    plan_type VARCHAR(20) DEFAULT 'BASIC',
    is_active BOOLEAN DEFAULT TRUE,
    oauth_provider VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
-- api_keys 테이블 (API 키 관리)
CREATE TABLE IF NOT EXISTS b2b.api_keys (
    key_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES b2b.companies(company_id) ON DELETE CASCADE,
    access_key VARCHAR(64) UNIQUE NOT NULL,
    key_name VARCHAR(50),
    daily_limit INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
-- api_usage 테이블 (일별 사용량 집계)
CREATE TABLE IF NOT EXISTS b2b.api_usage (
    usage_id BIGSERIAL PRIMARY KEY,
    key_id INTEGER REFERENCES b2b.api_keys(key_id) ON DELETE CASCADE,
    usage_date DATE DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0
);
-- api_logs 테이블 (API 호출 로그)
CREATE TABLE IF NOT EXISTS b2b.api_logs (
    log_id BIGSERIAL PRIMARY KEY,
    key_id INTEGER REFERENCES b2b.api_keys(key_id) ON DELETE CASCADE,
    endpoint VARCHAR(100),
    status_code INTEGER,
    process_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
-- content_rules 테이블 (브랜드 안전성 규칙)
CREATE TABLE IF NOT EXISTS b2b.content_rules (
    rule_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES b2b.companies(company_id) ON DELETE CASCADE,
    filter_type VARCHAR(20),
    filter_value VARCHAR(100),
    description TEXT
);
-- guest_sessions 테이블 (게스트 세션)
CREATE TABLE IF NOT EXISTS b2b.guest_sessions (
    session_id VARCHAR(36) PRIMARY KEY,
    key_id INTEGER REFERENCES b2b.api_keys(key_id) ON DELETE CASCADE,
    flight_time_minutes INTEGER,
    req_otts VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
-- B2B 인덱스
CREATE INDEX IF NOT EXISTS idx_api_keys_company ON b2b.api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_access_key ON b2b.api_keys(access_key);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_date ON b2b.api_usage(key_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_api_logs_key ON b2b.api_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON b2b.api_logs(created_at);
-- ============================================================
-- 테스트 데이터 (로컬 개발용)
-- ============================================================
-- 테스트 기업 계정 (password: test1234)
INSERT INTO b2b.companies (name, manager_email, password_hash, plan_type)
VALUES (
        'Test Company',
        'test@moviesir.cloud',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qJh1K1q1KSJQCC',
        'BASIC'
    ) ON CONFLICT (manager_email) DO NOTHING;
-- 테스트 API 키 (B2C Dog Fooding용)
-- 원본 키: sk-moviesir-local-test-key
-- SHA256 해시: echo -n "sk-moviesir-local-test-key" | sha256sum
INSERT INTO b2b.api_keys (
        company_id,
        access_key,
        key_name,
        daily_limit,
        is_active
    )
SELECT c.company_id,
    '8bad175acec18d6df6ad47c5c6fc2ebdf3c4c1558b2c35045dd0086f18aa474a',
    'Local Test Key',
    10000,
    TRUE
FROM b2b.companies c
WHERE c.manager_email = 'test@moviesir.cloud' ON CONFLICT (access_key) DO NOTHING;
COMMENT ON SCHEMA b2b IS 'B2B API 서비스 테이블';
COMMENT ON SCHEMA b2c IS 'B2C 사용자 서비스 테이블';
-- ============================================================
-- Public 스키마 테이블 (영화, OTT, 사용자)
-- ============================================================
-- OTT 제공자 테이블
CREATE TABLE IF NOT EXISTS public.ott_providers (
    provider_id INTEGER PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL,
    logo_path VARCHAR(255),
    display_priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE
);
-- 영화 테이블
CREATE TABLE IF NOT EXISTS public.movies (
    movie_id SERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    title VARCHAR(255) NOT NULL,
    overview TEXT,
    runtime INTEGER,
    genres VARCHAR(50) [],
    tag_genome JSONB,
    popularity DOUBLE PRECISION DEFAULT 0,
    vote_average DOUBLE PRECISION DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    poster_path VARCHAR(255),
    release_date DATE,
    adult BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 영화 벡터 테이블
CREATE TABLE IF NOT EXISTS public.movie_vectors (
    movie_id INTEGER PRIMARY KEY REFERENCES public.movies(movie_id) ON DELETE CASCADE,
    embedding vector(1024) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 영화-OTT 매핑 테이블
CREATE TABLE IF NOT EXISTS public.movie_ott_map (
    movie_id INTEGER NOT NULL REFERENCES public.movies(movie_id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES public.ott_providers(provider_id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL,
    link_url VARCHAR(500) NOT NULL,
    PRIMARY KEY (movie_id, provider_id)
);
-- 사용자 테이블
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(30) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER',
    is_email_verified BOOLEAN DEFAULT FALSE,
    profile_image_url VARCHAR(500),
    onboarding_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    refresh_token TEXT
);
-- 사용자-OTT 매핑 테이블
CREATE TABLE IF NOT EXISTS public.user_ott_map (
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES public.ott_providers(provider_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, provider_id)
);
-- 사용자 온보딩 답변 테이블
CREATE TABLE IF NOT EXISTS public.user_onboarding_answers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES public.movies(movie_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 사용자 벡터 테이블
CREATE TABLE IF NOT EXISTS public.user_vectors (
    user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    embedding vector(1024),
    updated_at TIMESTAMP
);
-- 온보딩 후보 영화 테이블
CREATE TABLE IF NOT EXISTS public.onboarding_candidates (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES public.movies(movie_id) ON DELETE CASCADE,
    mood_tag VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 추천 세션 테이블
CREATE TABLE IF NOT EXISTS public.recommendation_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    req_genres VARCHAR(50) [],
    req_runtime_max INTEGER,
    recommended_movie_ids INTEGER [],
    feedback_details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 영화 로그 테이블
CREATE TABLE IF NOT EXISTS public.movie_logs (
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES public.movies(movie_id) ON DELETE CASCADE,
    watched_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, movie_id)
);
-- 사용자 영화 피드백 테이블
CREATE TABLE IF NOT EXISTS public.user_movie_feedback (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES public.movies(movie_id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.recommendation_sessions(session_id) ON DELETE
    SET NULL,
        feedback_type VARCHAR(30) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
);
-- Public 스키마 인덱스
CREATE INDEX IF NOT EXISTS idx_movies_genres ON public.movies USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb ON public.movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_movie_ott_map_movie ON public.movie_ott_map(movie_id);
-- 기본 OTT 제공자 데이터
INSERT INTO public.ott_providers (
        provider_id,
        provider_name,
        logo_path,
        display_priority
    )
VALUES (8, 'Netflix', '/providers/netflix.png', 1),
    (337, 'Disney Plus', '/providers/disney.png', 2),
    (356, 'Wavve', '/providers/wavve.png', 3),
    (97, 'Watcha', '/providers/watcha.png', 4),
    (350, 'Apple TV', '/providers/appletv.png', 5),
    (
        3,
        'Google Play Movies',
        '/providers/googleplay.png',
        6
    ),
    (1883, 'TVING', '/providers/tving.png', 7) ON CONFLICT (provider_id) DO NOTHING;
-- ============================================================
-- 테스트 사용자 (B2C 로컬 테스트용)
-- ============================================================
-- password: test1234 (bcrypt hash)
INSERT INTO public.users (
        email,
        password_hash,
        nickname,
        is_email_verified,
        onboarding_completed_at
    )
VALUES (
        'test@test.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qJh1K1q1KSJQCC',
        '테스트유저',
        TRUE,
        NOW()
    ) ON CONFLICT (email) DO NOTHING;