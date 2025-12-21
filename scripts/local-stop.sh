#!/bin/bash
# MovieSir 로컬 개발 환경 종료 스크립트

echo "MovieSir 로컬 환경 종료 중..."
docker compose -f docker-compose.local.yml down

echo "완료!"
