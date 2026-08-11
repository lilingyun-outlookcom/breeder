#!/bin/bash
# ============================================
# 自动推送到 GitHub
# 用法: bash scripts/push.sh [branch]   （默认 master）
# 前置: 本地已 git commit；首次需 GitHub 认证（HTTPS PAT 或 SSH key）
# ============================================
set -e

APP_NAME="breeder"
REPO_URL="https://github.com/lilingyun-outlookcom/breeder.git"
BRANCH="${1:-master}"

# 非交互环境下禁止 git 弹出用户名/密码交互提示，避免脚本挂起
export GIT_TERMINAL_PROMPT=0

cd /opt/${APP_NAME}

# 0. 确认是 git 仓库
if [ ! -d .git ]; then
  echo "✗ 不是 git 仓库: $(pwd)"
  exit 1
fi

# 1. 确保远程 origin 指向本仓库
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "添加远程仓库 origin ..."
  git remote add origin "${REPO_URL}"
else
  CURRENT=$(git remote get-url origin)
  if [ "${CURRENT}" != "${REPO_URL}" ]; then
    echo "更新 origin 地址: ${CURRENT} -> ${REPO_URL}"
    git remote set-url origin "${REPO_URL}"
  fi
fi

# 2. 检查工作区是否干净（必须先提交）
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ 工作区有未提交的改动，请先 git commit:"
  git status --short
  exit 1
fi

# 3. 确认本地分支存在
if ! git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  echo "✗ 本地不存在分支 ${BRANCH}:"
  git branch
  exit 1
fi

# 4. 推送到 GitHub
echo "推送 ${BRANCH} -> origin/${BRANCH} ..."
if git push -u origin "${BRANCH}"; then
  echo "✓ 推送完成: https://github.com/${APP_NAME}/${APP_NAME}"
else
  echo ""
  echo "✗ 推送失败，请先完成 GitHub 认证，二选一："
  echo "  方式A（HTTPS PAT）: 在 GitHub 生成 Personal Access Token，然后执行"
  echo "    git config --global credential.helper store"
  echo "    git push -u origin ${BRANCH}   # 用户名填 GitHub 账号，密码填 PAT"
  echo "  方式B（SSH）: 生成 SSH 密钥并添加到 GitHub，然后执行"
  echo "    git remote set-url origin git@github.com:${APP_NAME}/${APP_NAME}.git"
  echo "    git push -u origin ${BRANCH}"
  exit 1
fi
