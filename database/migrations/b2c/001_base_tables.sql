-- =============================================
-- MovieSir B2C 스키마 (현재 운영 중)
-- 마이그레이션: 001_b2c_tables.sql
-- 생성일: 2025-01-06
-- =============================================

BEGIN;

-- =============================================
-- 1. 사용자 관련 테이블
-- =============================================

-- users: 사용자 계정
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    nickname VARCHAR(30) NOT NULL,
    onboarding_completed_at TIMESTAMP,
    deleted_at TIMESTAMP,
    refresh_token VARCHAR,
    role VARCHAR DEFAULT 'USER',
    is_email_verified BOOLEAN DEFAULT FALSE,
    profile_image_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- user_vectors: 사용자 임베딩 벡터 (pgvector)
CREATE TABLE IF NOT EXISTS user_vectors (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    embedding VECTOR(1024),
    updated_at TIMESTAMP
);

-- =============================================
-- 2. 영화 관련 테이블
-- =============================================

-- movies: 영화 메타데이터
CREATE TABLE IF NOT EXISTS movies (
    movie_id SERIAL PRIMARY KEY,
    tmdb_id INTEGER NOT NULL UNIQUE,
    title VARCHAR NOT NULL,
    overview TEXT,
    poster_path VARCHAR,
    vote_average FLOAT,
    vote_count INTEGER,
    genres VARCHAR[],
    runtime INTEGER,
    adult BOOLEAN DEFAULT FALSE,
    popularity FLOAT,
    tag_genome JSONB,
    release_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);

-- movie_vectors: 영화 임베딩 벡터 (pgvector)
CREATE TABLE IF NOT EXISTS movie_vectors (
    movie_id INTEGER PRIMARY KEY REFERENCES movies(movie_id) ON DELETE CASCADE,
    embedding VECTOR(1024),
    updated_at TIMESTAMP
);

-- =============================================
-- 3. OTT 관련 테이블
-- =============================================

-- ott_providers: OTT 제공자
CREATE TABLE IF NOT EXISTS ott_providers (
    provider_id SERIAL PRIMARY KEY,
    provider_name VARCHAR NOT NULL,
    logo_path VARCHAR,
    display_priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE
);

-- movie_ott_map: 영화-OTT 매핑 (N:N)
CREATE TABLE IF NOT EXISTS movie_ott_map (
    movie_id INTEGER REFERENCES movies(movie_id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES ott_providers(provider_id) ON DELETE CASCADE,
    link_url VARCHAR,
    PRIMARY KEY (movie_id, provider_id)
);

-- user_ott_map: 사용자-OTT 구독 (N:N)
CREATE TABLE IF NOT EXISTS user_ott_map (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES ott_providers(provider_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, provider_id)
);

-- =============================================
-- 4. 온보딩 관련 테이블
-- =============================================

-- onboarding_candidates: 온보딩 후보 영화
CREATE TABLE IF NOT EXISTS onboarding_candidates (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES movies(movie_id) ON DELETE CASCADE,
    mood_tag VARCHAR NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- user_onboarding_answers: 사용자 온보딩 답변
CREATE TABLE IF NOT EXISTS user_onboarding_answers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE
);

-- =============================================
-- 5. 추천/로깅 관련 테이블
-- =============================================

-- movie_logs: 시청 기록
CREATE TABLE IF NOT EXISTS movie_logs (
    user_id UUID,
    movie_id INTEGER,
    watched_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, movie_id)
);

-- movie_clicks: 클릭 로그
CREATE TABLE IF NOT EXISTS movie_clicks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    movie_id INTEGER,
    provider_id INTEGER,
    clicked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_clicks_id ON movie_clicks(id);

-- recommendation_sessions: 추천 세션
CREATE TABLE IF NOT EXISTS recommendation_sessions (
    session_id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    req_genres VARCHAR[],
    req_runtime_max INTEGER,
    recommended_movie_ids INTEGER[],
    feedback_details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 6. pgvector 확장 (필수)
-- =============================================

CREATE EXTENSION IF NOT EXISTS vector;

COMMIT;

-- =============================================
-- 테이블 확인
-- =============================================
-- \dt
-- \di
