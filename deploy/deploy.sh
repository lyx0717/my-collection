#!/usr/bin/env bash
# 一键部署到腾讯云服务器：rsync 代码 → 构建 → 启动 → 健康检查 → 冒烟测试
# 用法：./deploy/deploy.sh [服务器地址]   （默认 ubuntu@62.234.25.162）
set -euo pipefail

HOST="${1:-ubuntu@62.234.25.162}"
KEY="${DEPLOY_KEY:-$HOME/Downloads/lyx.pem}"
REMOTE_DIR=/opt/apps/mybook
SSH="ssh -i $KEY -o BatchMode=yes -o ConnectTimeout=10"
SCP="scp -i $KEY -o BatchMode=yes -o ConnectTimeout=10"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> 同步代码到 $HOST:$REMOTE_DIR"
# deploy/.env 与 node_modules / dist / .git / 本地 .env 不同步（.env 只在服务器上生成一次）
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '**/node_modules' \
  --exclude '**/dist' \
  --exclude '.pnpm-state' \
  --exclude '.env' \
  --exclude 'deploy/.env' \
  --exclude '.workbuddy-ai' \
  --exclude '*.pem' \
  -e "ssh -i $KEY -o BatchMode=yes -o ConnectTimeout=10" \
  "$REPO_ROOT/" "$HOST:$REMOTE_DIR/"

echo "==> 首次部署：生成 deploy/.env（含强随机数据库密码）"
$SSH "$HOST" "mkdir -p $REMOTE_DIR/deploy && \
  if [ ! -f $REMOTE_DIR/deploy/.env ]; then \
    printf 'DB_PASSWORD=%s\nWEB_PORT=8080\n' \"\$(openssl rand -hex 24)\" > $REMOTE_DIR/deploy/.env && \
    echo '已生成 .env'; \
  else \
    echo '.env 已存在，保留（密码不变）'; \
  fi"

echo "==> 构建并启动（db → migrate → api → web）"
$SSH "$HOST" "cd $REMOTE_DIR/deploy && docker compose build && docker compose up -d"

echo "==> 等待服务就绪"
IP="${HOST#*@}"
BASE="http://$IP:8080/api/v1"
for i in $(seq 1 30); do
  if curl -s --max-time 3 "$BASE/healthz" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "==> 冒烟测试（注册 → 建书签 → 重复 409 → 登出失效）"
JAR=$(mktemp)
MAIL="smoke-$(date +%s)@test.local"

CODE=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$MAIL\",\"password\":\"smoke-pass\"}")
[ "$CODE" = "201" ] && echo "  ✓ 注册" || { echo "  ✗ 注册（$CODE）"; exit 1; }

CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/bookmarks" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/smoke","title":"冒烟"}')
[ "$CODE" = "201" ] && echo "  ✓ 建书签" || { echo "  ✗ 建书签（$CODE）"; exit 1; }

CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/bookmarks" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/smoke","title":"重复"}')
[ "$CODE" = "409" ] && echo "  ✓ 重复链接 409" || { echo "  ✗ 重复链接（$CODE）"; exit 1; }

curl -s -o /dev/null -b "$JAR" -X POST "$BASE/auth/logout"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$BASE/auth/me")
[ "$CODE" = "401" ] && echo "  ✓ 登出后会话失效" || { echo "  ✗ 登出（$CODE）"; exit 1; }

rm -f "$JAR"
echo
echo "部署完成：http://$IP:8080"
