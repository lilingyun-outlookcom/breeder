#!/bin/bash
# ============================================
# 安装 systemd 服务 + 配置 Apache 路由 + 停止旧占位进程
# 用法: sudo bash /opt/breeder/scripts/install-systemd.sh
# 前置: db-setup.sh 已执行(.env 已生成)
# ============================================
set -e

APP_NAME="breeder"
LOG_DIR="/var/log/${APP_NAME}"
mkdir -p ${LOG_DIR}

echo "========== 安装系统服务开始 $(date) =========="

# 1. systemd 单元
echo "[1/5] 写入 systemd 单元..."
cat > /etc/systemd/system/breeder-dev.service <<EOF
[Unit]
Description=Breeder API (Development)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=breeder
Group=breeder
WorkingDirectory=/opt/${APP_NAME}/dev/backend
EnvironmentFile=/opt/${APP_NAME}/dev/backend/.env
ExecStart=/usr/bin/node /opt/${APP_NAME}/dev/backend/dist/index.js
Restart=on-failure
RestartSec=3
StandardOutput=append:${LOG_DIR}/dev.log
StandardError=append:${LOG_DIR}/dev.log

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/breeder-prod.service <<EOF
[Unit]
Description=Breeder API (Production)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=breeder
Group=breeder
WorkingDirectory=/opt/${APP_NAME}/prod/backend
EnvironmentFile=/opt/${APP_NAME}/prod/backend/.env
ExecStart=/usr/bin/node /opt/${APP_NAME}/prod/backend/dist/index.js
Restart=on-failure
RestartSec=3
StandardOutput=append:${LOG_DIR}/prod.log
StandardError=append:${LOG_DIR}/prod.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# 2. 停止旧的占位 Node 进程（dev/server、prod/server，占用了 3000/3001）
echo "[2/5] 停止旧占位进程..."
pkill -f '/opt/${APP_NAME}/dev/server' 2>/dev/null || true
pkill -f '/opt/${APP_NAME}/prod/server' 2>/dev/null || true
sleep 1

# 3. 启动服务
echo "[3/5] 启动 breeder-dev / breeder-prod..."
systemctl enable --now breeder-dev
systemctl enable --now breeder-prod
sleep 2
systemctl --no-pager status breeder-dev | head -5 || true
systemctl --no-pager status breeder-prod | head -5 || true

# 4. 配置 Apache（HTTPS 443 按路径路由 /dev/ /prod/）
echo "[4/5] 配置 Apache 路由..."
cat > /etc/apache2/sites-available/breeder-le-ssl.conf <<'APACHE'
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName breeder.sflswall.com.cn
    ServerAlias 110.40.139.112

    ProxyPreserveHost On

    # ---- 开发环境 (3000) ----
    ProxyPass /dev/api/ http://127.0.0.1:3000/api/
    ProxyPassReverse /dev/api/ http://127.0.0.1:3000/api/
    ProxyPass /dev/uploads/ http://127.0.0.1:3000/uploads/
    ProxyPassReverse /dev/uploads/ http://127.0.0.1:3000/uploads/
    ProxyPass /dev/ http://127.0.0.1:3000/
    ProxyPassReverse /dev/ http://127.0.0.1:3000/

    # ---- 生产环境 (3001) ----
    ProxyPass /prod/api/ http://127.0.0.1:3001/api/
    ProxyPassReverse /prod/api/ http://127.0.0.1:3001/api/
    ProxyPass /prod/uploads/ http://127.0.0.1:3001/uploads/
    ProxyPassReverse /prod/uploads/ http://127.0.0.1:3001/uploads/
    ProxyPass /prod/ http://127.0.0.1:3001/
    ProxyPassReverse /prod/ http://127.0.0.1:3001/

    # 根路径跳转到生产环境
    RedirectMatch ^/$ /prod/

    ErrorLog ${APACHE_LOG_DIR}/breeder-error.log
    CustomLog ${APACHE_LOG_DIR}/breeder-access.log combined

SSLCertificateFile /etc/letsencrypt/live/breeder.sflswall.com.cn/fullchain.pem
SSLCertificateKeyFile /etc/letsencrypt/live/breeder.sflswall.com.cn/privkey.pem
Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>
</IfModule>
APACHE

# HTTP 80 全部跳转 HTTPS
cat > /etc/apache2/sites-available/000-default.conf <<'APACHE'
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    ServerName breeder.sflswall.com.cn
    Redirect permanent / https://breeder.sflswall.com.cn/
</VirtualHost>
APACHE

a2enmod proxy proxy_http headers ssl rewrite >/dev/null 2>&1 || true
apache2ctl configtest
systemctl reload apache2
systemctl enable apache2

# 5. 健康检查
echo "[5/5] 健康检查..."
sleep 1
curl -s http://127.0.0.1:3000/api/health || echo "✗ dev 未响应"
echo ""
curl -s http://127.0.0.1:3001/api/health || echo "✗ prod 未响应"
echo ""
curl -sk -o /dev/null -w "HTTPS /dev/ -> %{http_code}\n" https://breeder.sflswall.com.cn/dev/ || true
curl -sk -o /dev/null -w "HTTPS /prod/ -> %{http_code}\n" https://breeder.sflswall.com.cn/prod/ || true

echo "========== 系统服务安装完成 =========="
echo "服务: systemctl status breeder-dev / breeder-prod"
echo "日志: tail -f /var/log/breeder/dev.log /var/log/breeder/prod.log"
