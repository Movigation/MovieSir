#!/bin/bash
# App Server 헬스 체크
# 위치: ~/scripts/healthcheck.sh
# Cron: 30 9 * * 1-5 (평일 09:30)

LOG_FILE=~/logs/health-$(date +%Y%m%d).log
mkdir -p ~/logs

echo "=== Health Check: $(date) ===" >> $LOG_FILE

# Backend 체크
BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/)
if [ "$BACKEND" = "200" ]; then
    echo "✅ Backend: OK" >> $LOG_FILE
else
    echo "❌ Backend: FAIL ($BACKEND)" >> $LOG_FILE
fi

# Nginx 체크
NGINX=$(sudo systemctl is-active nginx)
echo "📦 Nginx: $NGINX" >> $LOG_FILE

# 디스크 사용량
DISK=$(df / | tail -1 | awk '{print $5}')
echo "💾 Disk: $DISK" >> $LOG_FILE

# 메모리
MEM=$(free -h | grep Mem | awk '{print $3"/"$2}')
echo "🧠 Memory: $MEM" >> $LOG_FILE
