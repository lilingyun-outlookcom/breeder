# AGENTS.md

本文件记录本项目的开发与部署规范。任何代码、配置修改完成后都必须遵守以下规则。
后续如有新规范，逐步补充到本文件。

## 部署规范

- **默认（未特别说明）**：代码修改后自动构建并部署到 **PROD（生产环境）**，同时构建 dev。
- **DEV ONLY（仅开发）**：当任务中明确标注 "DEV ONLY" 或 "仅开发" 时，只部署到 dev 环境，**不部署 PROD**。
- 判断优先级：任务中明确出现 "DEV ONLY / 仅开发" 时按 DEV ONLY 执行，否则一律默认部署 PROD。

### 部署步骤

1. **前端 dev**：`cd dev/frontend && npm run build:dev`
   产物输出到 `dev/backend/public`，dev 后端（127.0.0.1:3000）直接提供静态文件。
2. **前端 PROD**（默认部署时执行）：
   - `cd dev/frontend && npm run build:prod`（产物输出到 `dev/frontend/dist-prod`）
   - `rsync -av --delete dist-prod/ /opt/breeder/prod/backend/public/`
3. **后端**（仅当后端代码有改动时）：`cd dev/backend && npm run build`，
   并按 `scripts/deploy.sh` 同步到 `prod/backend`（排除 `node_modules/.git/.env/public`），prod 依赖执行 `npm install`。
4. **重启**：仅前端静态资源变更时无需重启；后端代码变更后需
   `systemctl restart breeder-dev` 和/或 `systemctl restart breeder-prod`。
5. **验证**：
   - `curl http://127.0.0.1:3000/api/health`（dev）
   - `curl http://127.0.0.1:3001/api/health`（prod）
   - 确认环境返回的前端 bundle 文件名为最新构建产物。

> 完整部署链路可参考 `scripts/deploy.sh`。

## Git 提交规范

- 每次代码修改完成后**自动** `git add` + `git commit`，无需再向用户确认。
- commit message 使用中文，简述本次修改内容（多个相关改动可放在同一次提交）。
- 提交前检查工作区，只提交本次任务相关的文件，避免夹带无关改动。
- commit 完成后**自动** `git push` 推送到远程 GitHub
  （origin：`https://github.com/lilingyun-outlookcom/breeder.git`，默认分支 master；首次需完成 GitHub 认证）。
- 不执行 `git push --force`、`git reset`、`git rebase` 等其他破坏性 git 变更操作，除非用户明确要求。

## 环境信息

- dev 环境：`https://breeder.sflswall.com.cn/dev/`（后端 127.0.0.1:3000，服务 breeder-dev）
- PROD 环境：`https://breeder.sflswall.com.cn/prod/`（后端 127.0.0.1:3001，服务 breeder-prod）
- 前端构建：Vite（base 由 `VITE_BASE_PATH` 注入，dev=/dev/，prod=/prod/，经 Apache 反代剥离前缀）
- 后端：Express + MySQL，运行编译产物 `dist/index.js`

## 运维脚本

- **重启应用**：`bash scripts/restart.sh [dev|prod|all]`（默认 all）。
  sudo 密码从 `/opt/breeder/.env` 的 `BREEDER_SUDO_PASSWORD` 读取，无需交互输入，可放入 cron 调用。
- **prod 自动备份**：`bash scripts/backup-prod.sh`，由用户 crontab（breeder）每天 12:00 / 18:00 各执行一次。
  - 备份内容：prod 数据库（mysqldump 压缩）+ 上传文件（`uploads/prod`），输出到 `/opt/breeder/backups/prod`（不入库）。
  - 保留策略：自动清理 7 天前的备份；备份日志 `tail -f /opt/breeder/logs/backup.log`。
  - 数据库账号从 `prod/backend/.env` 读取，脚本无需 sudo。
- **prod 一键恢复**：`bash scripts/restore-prod.sh`，交互式选择备份（数据库/上传文件/全部）后恢复，
  完成后自动重启 prod 服务。⚠️ 会用所选备份覆盖 prod 当前数据，执行前需确认。

## 帮助系统（前端）

- 所有页面顶栏/悬浮按钮提供「帮助」入口：首页/登录页点击在新标签页打开完整手册（`#/help`），
  其他页面在本页弹窗展示当前页操作手册。
- 手册内容统一维护在 `dev/frontend/src/help/content.ts`，新增/修改页面后需同步补充对应章节。
