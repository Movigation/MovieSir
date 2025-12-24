# Database 초기화

## 로컬 개발용 DB 데이터

`database/init/` 폴더에 SQL 덤프 파일을 넣으면 로컬 Docker 시작 시 자동으로 로드됩니다.

### 덤프 파일 얻는 방법

GPU 서버에서 실행:
```bash
pg_dump -h localhost -U movigation -d moviesir > movigation.sql
```

### 파일 위치
```
database/
├── init/
│   ├── .gitkeep
│   └── movigation.sql  ← 여기에 덤프 파일 (git 제외됨)
└── README.md
```

    