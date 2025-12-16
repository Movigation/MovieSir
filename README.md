# Frontend (fe-dev)

## 작업 시작 전 필수
```bash
git switch fe-dev
git pull origin fe-dev
```

## 브랜치 생성
```bash
git switch -c fe/작업이름
```

## 작업 완료 후
```bash
git add .
git commit -m "FE: 작업이름"
git push origin fe/작업이름
```

## PR 생성
```
GitHub → Pull Request → New
base: fe-dev ← compare: fe/작업이름
```

## 네이밍 규칙

| 항목 | 형식 | 예시 |
|------|------|------|
| 브랜치 | fe/작업이름 | fe/로그인-UI |
| 커밋 | FE: 작업이름 | FE: 로그인-UI |
| 이슈 | [FE] 작업이름 | [FE] 로그인-UI |

main, dev 브랜치에서 직접 작업 금지
