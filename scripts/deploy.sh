#!/bin/bash
# ============================================
# 一键部署: dev -> prod
# 执行方式: sudo bash /opt/breeder/scripts/deploy.sh
# ============================================
set -e
APP_NAME="breeder"
DEV_DIR="/opt/${APP_NAME}/dev"
PROD_DIR="/opt/${APP_NAME}/prod"
LOG_DIR="/var/log/${APP_NAME}"
DEPLOY_LOG="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

exec > >(tee -a ${DEPLOY_LOG}) 2>&1

echo "========== 部署开始 $(date) =========="

# 1. 构建后端
echo "[1/5] 构建后端..."
cd ${DEV_DIR}/backend
pnpm install 2>/dev/null || npm install
pnpm build 2>/dev/null || npm run build

# 2. 构建前端
echo "[2/5] 构建前端..."
cd ${DEV_DIR}/frontend
pnpm install 2>/dev/null || npm install
pnpm build 2>/dev/null || npm run build
# 构建产物会自动输出到 backend/dist (按 vite.config.ts 配置)

# 3. 同步到生产环境
echo "[3/5] 同步到生产目录..."
rsync -av --delete --exclude=node_modules --exclude=.git \
  ${DEV_DIR}/backend/ ${PROD_DIR}/backend/
rsync -av --delete \
  ${DEV_DIR}/frontend/dist/ ${PROD_DIR}/backend/dist/

# 4. 安装生产依赖并启动
echo "[4/5] 安装生产依赖..."
cd ${PROD_DIR}/backend
npm install --production

echo "[5/5] 重启 PM2 服务..."
# 开发环境
sudo -u breeder bash -c "cd ${DEV_DIR}/backend && pm2 delete breeder-dev 2>/dev/null; PORT=3000 NODE_ENV=development pm2 start dist/index.js --name breeder-dev"
# 生产环境
sudo -u breeder bash -c "cd ${PROD_DIR}/backend && pm2 delete breeder-prod 2>/dev/null; PORT=80 NODE_ENV=production pm2 start dist/index.js --name breeder-prod"

pm2 save
pm2 startup systemd -u breeder --hp /home/breeder 2>/dev/null || true

echo "========== 部署完成 $(date) =========="
echo "开发环境: http://服务器IP:3000"
echo "生产环境: http://服务器IP (端口80)"
echo "日志查看: tail -f ${DEPLOY_LOG}"
