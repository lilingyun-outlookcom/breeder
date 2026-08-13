#!/bin/bash
# ============================================
# 一键部署: dev -> prod（含 dev 环境自身刷新）
# 用法: sudo bash /opt/breeder/scripts/deploy.sh
# 前置: MySQL 已初始化(scripts/db-setup.sh)、systemd 服务已安装
# ============================================
set -e

APP_NAME="breeder"
DEV_DIR="/opt/${APP_NAME}/dev"
PROD_DIR="/opt/${APP_NAME}/prod"
LOG_DIR="/var/log/${APP_NAME}"
DEPLOY_LOG="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

mkdir -p ${LOG_DIR}
exec > >(tee -a ${DEPLOY_LOG}) 2>&1

echo "========== 部署开始 $(date) =========="

# 0. 前置检查
command -v node >/dev/null 2>&1 || { echo "✗ 缺少 node"; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "✗ 缺少 rsync"; exit 1; }

# 1. 构建后端
echo "[1/6] 构建后端..."
cd ${DEV_DIR}/backend
npm install --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund
npm run build

# 2. 构建前端 dev 版本(base=/dev/，输出到 backend/public)
echo "[2/6] 构建前端 dev 版本..."
cd ${DEV_DIR}/frontend
npm install --no-audit --no-fund >/dev/null 2>&1 || true
npm run build:dev

# 3. 构建前端 prod 版本(base=/prod/，输出到 frontend/dist-prod)
echo "[3/6] 构建前端 prod 版本..."
npm run build:prod

# 4. 同步到生产目录（排除 node_modules/.git/.env/public，public 单独同步）
echo "[4/6] 同步到生产目录..."
rsync -av --delete --exclude=node_modules --exclude=.git --exclude=.env --exclude=public \
  ${DEV_DIR}/backend/ ${PROD_DIR}/backend/
rsync -av --delete ${DEV_DIR}/frontend/dist-prod/ ${PROD_DIR}/backend/public/

# 5. 安装生产依赖
echo "[5/6] 安装生产依赖..."
cd ${PROD_DIR}/backend
npm install --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund

# 6. 重启服务
echo "[6/6] 重启 systemd 服务..."
if [ -f /etc/systemd/system/breeder-dev.service ]; then
  systemctl restart breeder-dev || true
fi
if [ -f /etc/systemd/system/breeder-prod.service ]; then
  systemctl restart breeder-prod || true
fi

sleep 2
echo "--- 健康检查 ---"
curl -s http://127.0.0.1:3000/api/health || echo "dev 未响应"
curl -s http://127.0.0.1:3001/api/health || echo "prod 未响应"

echo "========== 部署完成 $(date) =========="
echo "开发环境: https://breeder.sflswall.com.cn/dev/"
echo "生产环境: https://breeder.sflswall.com.cn/prod/"
echo "日志: tail -f ${DEPLOY_LOG}"
