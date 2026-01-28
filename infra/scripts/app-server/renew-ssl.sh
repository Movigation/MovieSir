#!/bin/bash
# Let's Encrypt SSL 인증서 갱신
# 위치: /usr/local/bin/renew-ssl.sh
# Cron: 0 1 * * 1-5 (평일 01:00)

docker stop moviesir-frontend
certbot renew --quiet
docker start moviesir-frontend
