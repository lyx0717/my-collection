# 华为云 Flexus 部署（多项目托管架构）

生产地址：<http://121.36.46.119/>

## 架构

```
互联网 → 华为云安全组(22/80) → ufw → nginx 网关(80, 唯一对外)
                                      ├─ /            → /var/www/my-collection（前端静态）
                                      └─ /api/        → 127.0.0.1:3000（Fastify，systemd）
                                                          └─ 127.0.0.1:5432（PostgreSQL 16）
```

**没有任何服务直接暴露端口。** 应用进程与数据库全部绑定 `127.0.0.1`，只有 nginx 监听 `0.0.0.0:80`。

## 多项目隔离约定

新项目上线时**只增加文件，不修改已有项目**：

| 资源 | 本项目 | 下一个项目 | 隔离方式 |
|---|---|---|---|
| 前端目录 | `/var/www/my-collection/` | `/var/www/<项目>/` | 独立目录 |
| 后端代码 | `/opt/apps/my-collection/api/` | `/opt/apps/<项目>/api/` | 独立目录 |
| 环境变量 | `/opt/apps/my-collection/deploy/.env` (640) | 同名路径 | 独立文件 |
| 系统用户 | `mybook` | 新建独立用户 | 独立 UID |
| 后端端口 | `3000` | `3001`, `3002`… | 端口段 |
| systemd | `mybook-api.service` | `<项目>-api.service` | 独立 unit |
| nginx 站点 | `sites/my-collection.conf` | `sites/<项目>.conf` | `include` 加载 |
| 日志 | `/var/log/gateway/my-collection.*.log` | `/var/log/gateway/<项目>.*.log` | 分文件 |
| 数据库 | `mybook` 库 | 独立库 + 独立用户 | 库级隔离 |

**端口规划**：`3000-3099` 给后端 API，`3100-3199` 预留其他服务。nginx 是唯一占用 80/443 的进程。

**域名规划**：现在用 IP 访问，站点 `server_name 121.36.46.119`。有域名后在同一份 conf 里追加
`server_name example.com;` 即可，不影响其他站点。HTTPS 用 certbot 签发后加 `listen 443 ssl`。

## 目录结构

```
/opt/gateway/nginx/
├── sites/
│   ├── 00-default.conf          # default_server 兜底 404（未知 Host）
│   └── my-collection.conf       # 本项目
└── snippets/
    ├── gzip.conf
    └── security-headers.conf

/var/www/my-collection/          # 前端产物（nginx root）
/opt/apps/my-collection/
├── api/                         # 后端产物：dist/ + migrations/ + node_modules/
│   ├── dist/index.js            # 入口
│   ├── dist/migrate.js          # 迁移（node dist/migrate.js）
│   └── migrations/*.sql         # 必须与 dist/ 同级
└── deploy/.env                  # 环境变量（640 root:mybook）

/srv/data/                       # 预留：持久化数据
/var/log/gateway/                # 网关日志（按站点分文件）
/etc/systemd/system/mybook-api.service
```

## 日常运维

```bash
ssh huawei-flexus                # 免密，别名在 ~/.ssh/config

# 服务
systemctl status mybook-api
systemctl restart mybook-api
journalctl -u mybook-api -f

# 网关
nginx -t && systemctl reload nginx
ls /opt/gateway/nginx/sites/
tail -f /var/log/gateway/my-collection.access.log
tail -f /var/log/gateway/my-collection.error.log

# 数据库
sudo -u postgres psql -l
PGPASSWORD=$(grep ^DB_PASSWORD= /opt/apps/my-collection/deploy/.env | cut -d= -f2) \
  psql -h 127.0.0.1 -U mybook -d mybook

# 备份
PGPASSWORD=$(grep ^DB_PASSWORD= /opt/apps/my-collection/deploy/.env | cut -d= -f2) \
  pg_dump -h 127.0.0.1 -U mybook -Fc mybook > /srv/data/mybook-$(date +%F).dump

# 恢复
PGPASSWORD=... pg_restore -h 127.0.0.1 -U mybook -d mybook -c backup.dump
```

## 发布新版本

前端与后端产物准备好后（本地 `pnpm build`），同步到服务器的对应目录：

```bash
# 前端：先备份旧版再替换（rsync 会自动清理旧 hash 文件）
ssh huawei-flexus 'mkdir -p /var/www/.bak && mv /var/www/my-collection /var/www/.bak/my-collection-$(date +%s)'
rsync -az --delete dist/ huawei-flexus:/var/www/my-collection/
ssh huawei-flexus 'chown -R root:www-data /var/www/my-collection && chmod -R 755 /var/www/my-collection'

# 后端：替换 api/dist 后重启
rsync -az --delete api/dist/ huawei-flexus:/opt/apps/my-collection/api/dist/
ssh huawei-flexus 'systemctl restart mybook-api'
```

**回滚**：把 `/var/www/.bak/my-collection-<时间戳>` 换回来，或 `systemctl restart` 旧版本。

## 环境变量

见 `/opt/apps/my-collection/deploy/.env`（640，root:mybook）：

| 变量 | 值 | 说明 |
|---|---|---|
| `DATABASE_URL` | `postgres://mybook:<随机>@127.0.0.1:5432/mybook` | 唯一数据库配置源 |
| `DB_PASSWORD` | `<随机 48 位十六进制>` | 与上面保持一致 |
| `HOST` | `127.0.0.1` | **不要改成 0.0.0.0**，只让 nginx 反代 |
| `PORT` | `3000` | 下个项目用 3001 |
| `COOKIE_SECURE` | `false` | **纯 http 必须 false**，设 true 会导致登录后立刻跳回登录页 |
| `NODE_ENV` | `production` | |

后端**不读任何 `.env` 文件**（无 dotenv），只认进程环境变量。systemd 通过 `EnvironmentFile=` 注入。
手动前台启动必须自己 `export` 或 `set -a; . .env; set +a`。

## 备份与恢复

### 自动备份（已配置）

`/etc/cron.d/mybook-backup` 每日 **03:20** 调用 `/usr/local/bin/mybook-backup.sh`：

```
pg_dump -Fc  →  pg_restore --list 校验 TOC  →  大小 >4KB 检查  →  落位 + 轮转
```

| 保留策略 | 位置 | 期限 |
|---|---|---|
| 日备 | `/srv/data/backups/daily/` | 7 天 |
| 周备（每周日） | `/srv/data/backups/weekly/` | 28 天 |
| 月备（每月 1 号） | `/srv/data/backups/monthly/` | 92 天 |

周备/月备是日备的**硬链接**，不额外占空间。每一步失败都会 `logger` 写 systemd journal。

```bash
# 查看备份
ls -la /srv/data/backups/daily/
du -sh /srv/data/backups

# 看备份日志（失败也在这里）
journalctl -t mybook-backup -n 20
journalctl -t mybook-backup -p err --since "7 days ago"     # 只看错误

# 手动立即备份
/usr/local/bin/mybook-backup.sh
```

### 恢复演练（已完成，可复现）

不要等到真出事才第一次恢复。这条命令会把最新备份还原到临时库做校验，**不碰生产库**：

```bash
sudo -u postgres psql -c "CREATE DATABASE mybook_restore_test OWNER mybook;"
sudo -u postgres psql -d mybook_restore_test -c "GRANT ALL ON SCHEMA public TO mybook;"
export PGPASSWORD=$(grep ^DB_PASSWORD= /opt/apps/my-collection/deploy/.env | cut -d= -f2)
pg_restore -h 127.0.0.1 -U mybook -d mybook_restore_test --no-owner --no-privileges \
  $(ls -t /srv/data/backups/daily/*.dump | head -1)
psql -h 127.0.0.1 -U mybook -d mybook_restore_test -c '\dt'
sudo -u postgres psql -c "DROP DATABASE mybook_restore_test;"
```

**2026-10-24 实测结果**：还原后 5 张表全部就位，与主库表数量一致。

### 真·灾难恢复（生产库全毁时）

```bash
# 1. 从本机把最近备份拉到服务器（备份和数据库在同一台机器，机器没了备份也没了 —— 见下）
scp huawei-flexus:/srv/data/backups/daily/mybook-<日期>.dump ./

# 2. 重建库
sudo -u postgres psql -c "CREATE DATABASE mybook OWNER mybook;"
sudo -u postgres psql -d mybook -c "GRANT ALL ON SCHEMA public TO mybook; ALTER SCHEMA public OWNER TO mybook;"

# 3. 还原
export PGPASSWORD=$(grep ^DB_PASSWORD= /opt/apps/my-collection/deploy/.env | cut -d= -f2)
pg_restore -h 127.0.0.1 -U mybook -d mybook --no-owner --no-privileges mybook-<日期>.dump

# 4. 重启
systemctl restart mybook-api
```

### ⚠️ 备份的剩下一个缺口

**备份文件和数据在同一台机器上。** 机器/磁盘挂了，两个一起没。目前靠**华为云自动快照**兜这一层：

> 控制台 → 云硬盘 EVS → 找到系统盘 → 更多 → **开启自动快照**（建议：每天 1 次，保留 7 天）

这个只能你在控制台点，我没法代劳。配上之后，"应用层备份 + 系统层快照" 才算完整。

## 已知事项

1. **没有域名 = 没有 HTTPS**。当前是纯 http，密码明文过网。涉及真实密码前建议先上域名 + 证书。
2. **数据库密码**已备份到本机 `~/.my-collection-secrets/prod.env`（600，仓库外，不进 git）。建议再抄一份到密码管理器。
3. **自动备份已配置**（见上），但**未配置异地备份**，靠华为云快照补。快照需在控制台手动开启。
4. **2 Mbit/s 出网带宽**是体验瓶颈：前端首次加载 512 KB 约需 0.5–1s，图片/视频会明显慢。
5. 机器 **2 核 1.7 GiB**，已配 2 GB swap。API 进程 `MemoryMax=400M`，PG `shared_buffers=256MB`。
   同时再跑第二个重量级项目前，先看 `free -h` 和 `docker`/进程内存占用。
6. `.env` 里未启用 `COOKIE_SECURE`，未来上 HTTPS 后改成 `true`，并给 cookie 加 `__Host-` 前缀。

## 部署完成时的验证记录（2026-10-24）

```
curl -I http://121.36.46.119/                      → 200
curl    http://121.36.46.119/api/v1/healthz         → {"ok":true}
curl -I http://121.36.46.119/assets/index-*.js      → 200 application/javascript
POST   /api/v1/auth/register                        → 201
POST   /api/v1/auth/login                           → 200 + Set-Cookie
GET    /api/v1/library (带 cookie)                   → 200 {"bookmarks":[],"collections":[]}
POST   /api/v1/bookmarks                            → 201
POST   /api/v1/bookmarks (重复 URL)                  → 409
GET    /api/v1/library (无 cookie)                   → 401
POST   /api/v1/auth/logout → GET /library           → 401
systemctl restart mybook-api                        → active
```
