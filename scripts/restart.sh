#!/bin/bash
# ============================================
# 一键重启 dev / prod 应用（systemd 服务）
# 用法: bash scripts/restart.sh [dev|prod|all]
#       不传参数默认重启全部
# 说明: sudo 密码从 /opt/breeder/.env 的 BREEDER_SUDO_PASSWORD 读取，
#       无需交互输入密码，可放入 cron 定时调用
# ============================================
set -e

ENV_FILE="/opt/breeder/.env"
TARGET="${1:-all}"

# 1. 读取 sudo 密码
if [ ! -f "${ENV_FILE}" ]; then
  echo "✗ 未找到 ${ENV_FILE}，请先创建并写入 BREEDER_SUDO_PASSWORD"
  exit 1
fi
# shellcheck disable=SC1090
source "${ENV_FILE}"
if [ -z "${BREEDER_SUDO_PASSWORD}" ]; then
  echo "✗ ${ENV_FILE} 中缺少 BREEDER_SUDO_PASSWORD"
  exit 1
fi

# 通过 sudo -S 从 stdin 读取密码执行命令
sudo_run() {
  echo "${BREEDER_SUDO_PASSWORD}" | sudo -S -p '' "$@" 2>/dev/null
}

restart_service() {
  local svc="$1" label="$2"
  if ! sudo_run systemctl list-unit-files | grep -q "^${svc}\.service"; then
    echo "✗ 服务 ${svc}.service 不存在，跳过"
    return 0
  fi
  echo "[*] 重启 ${label}（${svc}.service）..."
  sudo_run systemctl restart "${svc}.service"
  sleep 2
  if sudo_run systemctl is-active --quiet "${svc}.service"; then
    echo "  ✓ ${label} 已重启"
  else
    echo "  ✗ ${label} 重启失败，请查看日志: journalctl -u ${svc} -n 50"
  fi
}

case "${TARGET}" in
  dev)
    restart_service breeder-dev "dev 应用"
    ;;
  prod)
    restart_service breeder-prod "prod 应用"
    ;;
  all)
    restart_service breeder-dev "dev 应用"
    restart_service breeder-prod "prod 应用"
    ;;
  *)
    echo "用法: $0 [dev|prod|all]"
    exit 1
    ;;
esac

# 2. 健康检查
echo "--- 健康检查 ---"
if [ "${TARGET}" != "prod" ]; then
  curl -s -m 5 http://127.0.0.1:3000/api/health && echo "" || echo "✗ dev 未响应"
fi
if [ "${TARGET}" != "dev" ]; then
  curl -s -m 5 http://127.0.0.1:3001/api/health && echo "" || echo "✗ prod 未响应"
fi
echo "========== 重启完成 $(date '+%F %T') =========="
