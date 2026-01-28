#!/bin/bash
# 주간 서버 정리 (로그 + Docker)
# 위치: ~/scripts/weekly-cleanup.sh
# Cron: 0 17 * * 5 (매주 금 17:00)

echo "=== 주간 서버 정리 시작: $(date) ==="

# 1. Journal 로그 정리
echo "📋 Journal 로그 정리..."
sudo journalctl --vacuum-time=7d

# 2. Docker 정리
echo "🐳 Docker 정리..."
docker system prune -f

# 3. 디스크 상태 확인
echo "💾 디스크 상태:"
df -h /

echo "=== 정리 완료: $(date) ==="
