#!/bin/bash
# ============================================
# prod 一键恢复: 从备份中选择要恢复的备份并恢复到 prod
# 用法: bash scripts/restore-prod.sh
# 备份目录: /opt/breeder/backups/prod
# 说明: 恢复数据库需连接 MySQL（账号从 prod/backend/.env 读取）；
#       恢复完成后会自动重启 prod 服务（sudo 密码从 /opt/breeder/.env 读取）
# 警告: 本操作会用所选备份覆盖 prod 当前数据，执行前请务必确认！
# ============================================
set -e

APP_NAME="breeder"
BACKUP_DIR="/opt/${APP_NAME}/backups/prod"
PROD_ENV="/opt/${APP_NAME}/prod/backend/.env"
ROOT_ENV="/opt/${APP_NAME}/.env"

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "✗ 备份目录 ${BACKUP_DIR} 不存在"
  exit 1
fi

echo "========== prod 恢复工具 =========="
echo "备份目录: ${BACKUP_DIR}"
echo ""

# ---------- 工具函数 ----------
sudo_run() {
  echo "${BREEDER_SUDO_PASSWORD}" | sudo -S -p '' "$@" 2>/dev/null
}

restart_prod() {
  if [ -f "${ROOT_ENV}" ]; then
    # shellcheck disable=SC1090
    source "${ROOT_ENV}"
    if [ -n "${BREEDER_SUDO_PASSWORD}" ]; then
      echo "[*] 重启 prod 服务 ..."
      sudo_run systemctl restart breeder-prod.service
      sleep 2
      curl -s -m 5 http://127.0.0.1:3001/api/health && echo "" || echo "  ✗ prod 未响应"
    else
      echo "  ! 未读取到 sudo 密码，请手动重启: systemctl restart breeder-prod"
    fi
  else
    echo "  ! 未找到 ${ROOT_ENV}，请手动重启: systemctl restart breeder-prod"
  fi
}

# 列出指定类型备份并让用户选择；所选完整路径写入 stdout，菜单/提示输出到 stderr
pick_backup() {
  local pattern="$1" desc="$2"
  local files=()
  while IFS= read -r f; do
    files+=("$f")
  done < <(ls -1 ${BACKUP_DIR}/${pattern} 2>/dev/null | sort -r)

  if [ ${#files[@]} -eq 0 ]; then
    echo "" >&2
    return 1
  fi

  echo "" >&2
  echo "请选择要恢复的${desc}:" >&2
  local i
  for i in "${!files[@]}"; do
    local f="${files[$i]}" ts dt size
    ts="${f##*-}" # 文件名时间戳，如 20260811-120000.sql.gz
    if [[ "${ts}" =~ ^([0-9]{8})-([0-9]{2})([0-9]{2}) ]]; then
      dt="${BASH_REMATCH[1]} ${BASH_REMATCH[2]}:${BASH_REMATCH[3]}"
    else
      dt=$(stat -c %y "${f}" 2>/dev/null | cut -d. -f1)
    fi
    size=$(du -h "${f}" | cut -f1)
    printf "  [%d] %s  (%s, %s)\n" $((i + 1)) "$(basename "${f}")" "${size}" "${dt}" >&2
  done
  echo "  [0] 取消" >&2
  printf "请输入编号: " >&2

  local chosen idx
  read -r chosen
  if [ "${chosen}" = "0" ]; then
    return 1
  fi
  idx=$((chosen - 1))
  if [[ "${chosen}" =~ ^[0-9]+$ ]] && [ "${chosen}" -ge 1 ] && [ "${chosen}" -le "${#files[@]}" ]; then
    echo "${files[$idx]}"
  else
    return 1
  fi
}

confirm() {
  printf "%s [y/N]: " "$1"
  local ans
  read -r ans
  [ "${ans}" = "y" ] || [ "${ans}" = "Y" ]
}

restore_db() {
  local file="$1" name="$2"
  if [ ! -f "${PROD_ENV}" ]; then
    echo "✗ 未找到 ${PROD_ENV}，无法读取数据库配置"
    return 1
  fi
  set -a; source "${PROD_ENV}"; set +a
  DB_HOST="${DB_HOST:-127.0.0.1}"
  DB_PORT="${DB_PORT:-3306}"
  DB_USER="${DB_USER:-breeder}"
  DB_NAME="${DB_NAME:-breeder_prod}"
  echo "[*] 恢复数据库 ${DB_NAME}（${name}）..."
  gunzip -c "${file}" | mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}"
  echo "  ✓ 数据库恢复完成"
}

restore_uploads() {
  local file="$1" name="$2"
  local uploads_root="/opt/${APP_NAME}/uploads"
  echo "[*] 恢复上传文件（${name}）..."
  mkdir -p "${uploads_root}"
  tar -xzf "${file}" -C "${uploads_root}"
  chown -R breeder:breeder "${uploads_root}" 2>/dev/null || true
  echo "  ✓ 上传文件恢复完成"
}

# ---------- 主流程 ----------
echo "请选择恢复类型:"
echo "  [1] 数据库 (db-*.sql.gz)"
echo "  [2] 上传文件 (uploads-*.tar.gz)"
echo "  [3] 全部恢复（数据库 + 上传文件）"
echo "  [0] 退出"
printf "请输入编号: "
read -r RESTORE_TYPE

case "${RESTORE_TYPE}" in
  1) DO_DB=1 ;;
  2) DO_FILE=1 ;;
  3) DO_DB=1; DO_FILE=1 ;;
  0) echo "已取消"; exit 0 ;;
  *) echo "✗ 无效选择"; exit 1 ;;
esac

DB_FILE=""
FS_FILE=""
if [ "${DO_DB:-}" = "1" ]; then
  DB_FILE=$(pick_backup "db-*.sql.gz" "数据库备份" || true)
  if [ -z "${DB_FILE}" ]; then
    echo "已取消或没有可用备份"
    exit 1
  fi
fi
if [ "${DO_FILE:-}" = "1" ]; then
  FS_FILE=$(pick_backup "uploads-*.tar.gz" "文件备份" || true)
  if [ -z "${FS_FILE}" ]; then
    echo "已取消或没有可用备份"
    exit 1
  fi
fi

echo ""
echo "========== 即将执行恢复 =========="
[ -n "${DB_FILE}" ] && echo "  数据库: ${DB_FILE}"
[ -n "${FS_FILE}" ] && echo "  文件:   ${FS_FILE}"
echo "这将会覆盖 prod 当前数据，且无法撤销！"
if ! confirm "确认继续恢复？"; then
  echo "已取消"
  exit 0
fi

[ -n "${DB_FILE}" ] && restore_db "${DB_FILE}" "$(basename "${DB_FILE}")"
[ -n "${FS_FILE}" ] && restore_uploads "${FS_FILE}" "$(basename "${FS_FILE}")"

echo ""
echo "========== 恢复完成 $(date '+%F %T') =========="
restart_prod
echo "恢复流程结束，请登录生产环境检查数据。"
