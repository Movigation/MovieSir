#!/bin/bash
# 디스크 사용률 80% 초과 시 경고
# 위치: ~/scripts/disk-alert.sh
# Cron: 30 17 * * 1-5 (평일 17:30)

THRESHOLD=80
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $USAGE -gt $THRESHOLD ]; then
    echo "⚠️ 디스크 사용률 ${USAGE}% - 정리 필요!"
fi
