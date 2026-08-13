#!/bin/bash
# ============================================
# MySQL 初始化: 建库/建用户/写入 .env/设置时区
# 用法: sudo bash /opt/breeder/scripts/db-setup.sh
# 依赖: mysql-server 已安装
# ============================================
set -e

echo "========== 数据库初始化开始 $(date) =========="

# 1. 系统时区设为北京时间（业务时间统一按北京时间处理）
timedatectl set-timezone Asia/Shanghai 2>/dev/null || true
echo "[1/4] 时区: $(date '+%Y-%m-%d %H:%M:%S %Z')"

# 2. 生成随机密码与密钥
DB_PASS=$(openssl rand -hex 12)
JWT_SECRET=$(openssl rand -hex 24)

# 3. 创建数据库与用户（root 通过 unix_socket 认证）
echo "[2/4] 创建数据库 breeder_dev / breeder_prod 与用户 breeder..."
mysql <<SQL
CREATE DATABASE IF NOT EXISTS breeder_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS breeder_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'breeder'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER 'breeder'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON breeder_dev.* TO 'breeder'@'localhost';
GRANT ALL PRIVILEGES ON breeder_prod.* TO 'breeder'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "    -> 数据库与用户创建完成"

# 4. 写入环境配置
echo "[3/4] 写入环境配置 .env..."
mkdir -p /opt/breeder/uploads/dev /opt/breeder/uploads/prod
cat > /opt/breeder/dev/backend/.env <<EOF
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=breeder
DB_PASSWORD=${DB_PASS}
DB_NAME=breeder_dev
JWT_SECRET=${JWT_SECRET}
UPLOAD_DIR=/opt/breeder/uploads/dev
EOF
cat > /opt/breeder/prod/backend/.env <<EOF
PORT=3001
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=breeder
DB_PASSWORD=${DB_PASS}
DB_NAME=breeder_prod
JWT_SECRET=${JWT_SECRET}
UPLOAD_DIR=/opt/breeder/uploads/prod
EOF
chmod 600 /opt/breeder/dev/backend/.env /opt/breeder/prod/backend/.env

echo "[4/4] 修正目录属主..."
chown -R breeder:breeder /opt/breeder 2>/dev/null || true
chown -R breeder:breeder /opt/breeder/uploads 2>/dev/null || true

echo "========== 数据库初始化完成 =========="
echo "库: breeder_dev / breeder_prod"
echo "用户: breeder@localhost（密码已写入各环境 .env）"
echo "下一步: 安装 systemd 服务 -> scripts/install-systemd.sh"
