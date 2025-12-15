# AI (ai-dev)

## 작업 시작 전 필수
```bash
git switch ai-dev
git pull origin ai-dev
```

## 브랜치 생성
```bash
git switch -c ai/작업이름
```

## 작업 완료 후
```bash
git add .
git commit -m "AI: 작업이름"
git push origin ai/작업이름
```

## PR 생성
```
GitHub → Pull Request → New
base: ai-dev ← compare: ai/작업이름
```

## 네이밍 규칙

| 항목 | 형식 | 예시 |
|------|------|------|
| 브랜치 | ai/작업이름 | ai/추천-모델 |
| 커밋 | AI: 작업이름 | AI: 추천-모델 |
| 이슈 | [AI] 작업이름 | [AI] 추천-모델 |

main, dev 브랜치에서 직접 작업 금지
