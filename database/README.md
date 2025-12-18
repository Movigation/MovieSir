# Database Setup

## 로컬 개발 환경

`movigation.sql` 파일은 용량이 커서 Git에 포함되지 않습니다.

### 다운로드
Google Drive에서 `movigation.sql` 다운로드 후 이 폴더에 저장

### PostgreSQL에 임포트
```bash
psql -U moviesir -d moviesir < movigation.sql
```

## 프로덕션 환경 (GPU Server)

이미 PostgreSQL에 데이터가 로드되어 있음:
- Host: 10.0.35.62
- Database: moviesir
- User: movigation
