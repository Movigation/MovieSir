#!/bin/bash
# PostgreSQL 일일 백업 (7일 보관)
# 위치: /usr/local/bin/backup-db.sh
# Cron: 0 8 * * 1-5 (평일 08:00)
# 환경변수: /etc/backup-db.env (DB_PASSWORD)

source /etc/backup-db.env

BACKUP_DIR="/var/backups/postgresql"
DB_NAME="moviesir"
DB_USER="movigation"
DATE=$(date +%Y%m%d_%H%M%S)

PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U $DB_USER $DB_NAME > $BACKUP_DIR/moviesir_$DATE.sql

find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "[$DATE] Backup completed"
