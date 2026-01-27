-- =============================================
-- MovieSir B2B 스키마 생성
-- 000: 기본 테이블 및 인덱스
-- 생성일: 2025-01-14
-- =============================================

BEGIN;

-- B2B 스키마 생성
CREATE SCHEMA IF NOT EXISTS b2b;

-- =============================================
-- 1. companies (기업 고객)
-- =============================================
CREATE TABLE IF NOT EXISTS b2b.companies (
    company_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    plan_type VARCHAR(20) DEFAULT 'BASIC',  -- BASIC, PRO, ENTERPRISE
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 2. api_keys (API 키 관리)
-- =============================================
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

CREATE INDEX IF NOT EXISTS idx_api_keys_company_id ON b2b.api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_access_key ON b2b.api_keys(access_key);

-- =============================================
-- 3. api_usage (일별 사용량 집계)
-- =============================================
CREATE TABLE IF NOT EXISTS b2b.api_usage (
    usage_id BIGSERIAL PRIMARY KEY,
    key_id INTEGER REFERENCES b2b.api_keys(key_id) ON DELETE CASCADE,
    usage_date DATE DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_date ON b2b.api_usage(key_id, usage_date);

-- =============================================
-- 4. api_logs (API 원천 로그)
-- =============================================
CREATE TABLE IF NOT EXISTS b2b.api_logs (
    log_id BIGSERIAL PRIMARY KEY,
    key_id INTEGER REFERENCES b2b.api_keys(key_id) ON DELETE CASCADE,
    endpoint VARCHAR(100),
    status_code INTEGER,
    process_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_key_id ON b2b.api_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON b2b.api_logs(created_at);

-- =============================================
-- 5. content_rules (브랜드 안전성 규칙)
-- =============================================
CREATE TABLE IF NOT EXISTS b2b.content_rules (
    rule_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES b2b.companies(company_id) ON DELETE CASCADE,
    filter_type VARCHAR(20),  -- KEYWORD, GENRE, ID
    filter_value VARCHAR(100),
    description TEXT
);

-- =============================================
-- 6. guest_sessions (게스트 세션)
-- =============================================
CREATE TABLE IF NOT EXISTS b2b.guest_sessions (
    session_id VARCHAR(36) PRIMARY KEY,
    key_id INTEGER REFERENCES b2b.api_keys(key_id) ON DELETE CASCADE,
    flight_time_minutes INTEGER,
    req_otts VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_key_id ON b2b.guest_sessions(key_id);

COMMIT;
