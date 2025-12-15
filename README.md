# Backend (be-dev)

## 작업 시작 전 필수
```bash
git switch be-dev
git pull origin be-dev
```

## 브랜치 생성
```bash
git switch -c be/작업이름
```

## 작업 완료 후
```bash
git add .
git commit -m "BE: 작업이름"
git push origin be/작업이름
```

## PR 생성
```
GitHub → Pull Request → New
base: be-dev ← compare: be/작업이름
```

## 네이밍 규칙

| 항목 | 형식 | 예시 |
|------|------|------|
| 브랜치 | be/작업이름 | be/유저-API |
| 커밋 | BE: 작업이름 | BE: 유저-API |
| 이슈 | [BE] 작업이름 | [BE] 유저-API |

main, dev 브랜치에서 직접 작업 금지
