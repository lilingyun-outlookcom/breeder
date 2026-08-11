#!/bin/bash
# ============================================
# prod 环境自动备份: 数据库 + 上传文件
# 定时: cron 每天 12:00 / 18:00 各一次
#   crontab -e (用户 breeder):
#   0 12 * * * /opt/breeder/scripts/backup-prod.sh >> /opt/breeder/logs/backup.log 2>&1
#   0 18 * * * /opt/breeder/scripts/backup-prod.sh >> /opt/breeder/logs/backup.log 2>&1
# 保留: 7 天，自动清理更早的备份（文件按时间戳命名，位于 /opt/breeder/backups/prod）
# 说明: 数据库账号从 prod/backend/.env 读取，本脚本无需 root/sudo
# ============================================
set -e
set -o pipefail

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

APP_NAME="breeder"
ENV_FILE="/opt/${APP_NAME}/prod/backend/.env"
BACKUP_DIR="/opt/${APP_NAME}/backups/prod"
LOG_DIR="/opt/${APP_NAME}/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "${BACKUP_DIR}" "${LOG_DIR}"

# 读取 prod 数据库配置
if [ ! -f "${ENV_FILE}" ]; then
  echo "✗ 未找到 ${ENV_FILE}，无法读取数据库配置"
  exit 1
fi
set -a; source "${ENV_FILE}"; set +a

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-breeder}"
DB_NAME="${DB_NAME:-breeder_prod}"
UPLOAD_DIR="${UPLOAD_DIR:-/opt/${APP_NAME}/uploads/prod}"

echo "===== prod 备份开始 $(date '+%F %T') ====="

# 1. 备份数据库（单事务快照，保证一致性）
echo "[1/3] 备份数据库 ${DB_NAME} ..."
# --no-tablespaces: 普通业务库不需要表空间备份，避免需要 PROCESS 权限
mysqldump --single-transaction --quick --routines --triggers --no-tablespaces \
  -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" \
  | gzip > "${BACKUP_DIR}/db-${TIMESTAMP}.sql.gz"
DB_SIZE=$(du -h "${BACKUP_DIR}/db-${TIMESTAMP}.sql.gz" | cut -f1)
echo "  -> ${BACKUP_DIR}/db-${TIMESTAMP}.sql.gz (${DB_SIZE})"

# 2. 备份上传文件
echo "[2/3] 备份上传文件 ..."
if [ -d "${UPLOAD_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/uploads-${TIMESTAMP}.tar.gz" \
    -C "$(dirname "${UPLOAD_DIR}")" "$(basename "${UPLOAD_DIR}")"
  FS_SIZE=$(du -h "${BACKUP_DIR}/uploads-${TIMESTAMP}.tar.gz" | cut -f1)
  echo "  -> ${BACKUP_DIR}/uploads-${TIMESTAMP}.tar.gz (${FS_SIZE})"
else
  echo "  -> ${UPLOAD_DIR} 不存在，跳过文件备份"
fi

# 3. 清理 7 天前的备份（保留最近 7 天）
echo "[3/3] 清理 7 天前的备份 ..."
find "${BACKUP_DIR}" -type f -mtime +6 -delete
KEPT=$(find "${BACKUP_DIR}" -type f | wc -l)
echo "  当前保留 ${KEPT} 个备份文件:"
find "${BACKUP_DIR}" -type f | sort | sed 's/^/    /'

echo "===== prod 备份完成 $(date '+%F %T') ====="
