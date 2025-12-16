# Git 작업 가이드

## 작업 시작 전 필수

**도메인** : fe-dev, be-dev, ai-dev, db-dev

```bash
git switch {도메인}-dev
git pull origin {도메인}-dev
```

## 브랜치 생성

```bash
git switch -c {도메인}/작업이름
```

## 작업 완료 후

```bash
git add .
git commit -m "{도메인}: 작업이름"
git push origin {도메인}/작업이름
```

## PR 생성

```
GitHub → Pull Request → New
base: {도메인}-dev ← compare: {도메인}/작업이름
```

## PR 머지 후

```bash
git switch {도메인}-dev
git branch -d {도메인}/작업이름
```

---
