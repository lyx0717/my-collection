#!/usr/bin/env bash
# 华为云 Flexus 首次部署脚本（幂等：重复跑不会破坏已有数据）
# 用法：./deploy/install.sh
#
# 前置：本机已配置 ssh 别名 huawei-flexus（~/.ssh/config），且部署包在 /tmp/mycol-deploy/
set -euo pipefail

HOST="${DEPLOY_HOST:-huawei-flexus}"
PKG="${DEPLOY_PKG:-/tmp/mycol-deploy}"
REMOTE_API=/opt/apps/my-collection/api
REMOTE_WEB=/var/www/my-collection
ENV_FILE=/opt/apps/my-collection/deploy/.env

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

say "检查部署包"
[ -d "$PKG/web" ] && [ -d "$PKG/api" ] || { echo "缺少 $PKG/web 或 $PKG/api"; exit 1; }

say "打包上传（排除 macOS ._ 资源文件）"
COPYFILE_DISABLE=1 tar czf /tmp/mycol-deploy-clean.tar.gz -C "$PKG" web api .env.example
scp -q /tmp/mycol-deploy-clean.tar.gz "$HOST":/tmp/

say "解包并清理"
ssh "$HOST" 'set -e
  mkdir -p /root/trash
  rm -rf /tmp/mycol-stage && mkdir -p /tmp/mycol-stage
  tar xzf /tmp/mycol-deploy-clean.tar.gz -C /tmp/mycol-stage
  find /tmp/mycol-stage -name "._*" -delete'

say "部署前端（旧版移到 /var/www/.bak 备份）"
ssh "$HOST" "set -e
  mkdir -p /var/www/.bak
  [ -d $REMOTE_WEB ] && mv $REMOTE_WEB /var/www/.bak/my-collection-\$(date +%s) || true
  mkdir -p $REMOTE_WEB
  cp -a /tmp/mycol-stage/web/. $REMOTE_WEB/
  chown -R root:www-data $REMOTE_WEB
  chmod -R 755 $REMOTE_WEB"

say "部署后端"
ssh "$HOST" "set -e
  mkdir -p $REMOTE_API
  [ -d $REMOTE_API/dist ] && mv $REMOTE_API/dist /root/trash/api-dist-\$(date +%s) || true
  cp -a /tmp/mycol-stage/api/. $REMOTE_API/
  chown -R mybook:mybook $REMOTE_API
  chmod -R 755 $REMOTE_API"

say "环境变量（首次生成随机密码，已存在则保留）"
ssh "$HOST" "set -e
  if [ ! -f $ENV_FILE ]; then
    DBPASS=\$(openssl rand -hex 24)
    mkdir -p \$(dirname $ENV_FILE)
    printf 'DATABASE_URL=postgres://mybook:%s@127.0.0.1:5432/mybook\nDB_PASSWORD=%s\nHOST=127.0.0.1\nPORT=3000\nCOOKIE_SECURE=false\nNODE_ENV=production\n' \$DBPASS \$DBPASS > $ENV_FILE
    echo '已生成 .env'
  else
    echo '.env 已存在，保留'
  fi
  chown root:mybook $ENV_FILE && chmod 640 $ENV_FILE"

say "数据库迁移"
ssh "$HOST" "set -e
  cd $REMOTE_API
  set -a; . $ENV_FILE; set +a
  node dist/migrate.js"

say "启动服务"
ssh "$HOST" "systemctl daemon-reload && systemctl enable --now mybook-api
  sleep 2
  nginx -t
  systemctl reload nginx
  systemctl is-active nginx mybook-api postgresql"

say "冒烟测试"
BASE="http://121.36.46.119/api/v1"
JAR=$(mktemp)
MAIL="smoke-$(date +%s)@smoke.local"
FAIL=0

check() { if [ "$2" = "$3" ]; then echo "  ✓ $1 ($2)"; else echo "  ✗ $1 期望 $3 实际 $2"; FAIL=1; fi; }

check "首页"     "$(curl -s -o /dev/null -w '%{http_code}' http://121.36.46.119/)" 200
check "健康检查"  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/healthz")" 200
check "注册"     "$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$MAIL\",\"password\":\"smoke-pass\"}")" 201
check "登录"     "$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$MAIL\",\"password\":\"smoke-pass\"}")" 200
check "读数据"   "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$BASE/library")" 200
check "建书签"   "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/bookmarks" -H 'Content-Type: application/json' -d '{"url":"https://example.com/smoke","title":"冒烟"}')" 201
check "重复 409" "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/bookmarks" -H 'Content-Type: application/json' -d '{"url":"https://example.com/smoke","title":"重复"}')" 409
check "未登录"   "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/library")" 401

rm -f "$JAR"

say "清理冒烟数据"
ssh "$HOST" "set -a; . $ENV_FILE; set +a
  PGPASSWORD=\$DB_PASSWORD psql -h 127.0.0.1 -U mybook -d mybook -q -c \"DELETE FROM users WHERE email LIKE '%@smoke.local'\""

rm -f /tmp/mycol-deploy-clean.tar.gz

if [ "$FAIL" = "1" ]; then
  echo
  echo "❌ 冒烟测试未全部通过"
  exit 1
fi

echo
echo "✅ 部署完成：http://121.36.46.119/"
