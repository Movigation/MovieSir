# Database (db-dev)

## 작업 시작 전 필수
```bash
git switch db-dev
git pull origin db-dev
```

## 브랜치 생성
```bash
git switch -c db/작업이름
```

## 작업 완료 후
```bash
git add .
git commit -m "DB: 작업이름"
git push origin db/작업이름
```

## PR 생성
```
GitHub → Pull Request → New
base: db-dev ← compare: db/작업이름
```

## 네이밍 규칙

| 항목 | 형식 | 예시 |
|------|------|------|
| 브랜치 | db/작업이름 | db/테이블-생성 |
| 커밋 | DB: 작업이름 | DB: 테이블-생성 |
| 이슈 | [DB] 작업이름 | [DB] 테이블-생성 |

main, dev 브랜치에서 직접 작업 금지
