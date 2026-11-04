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
│   ├── my-collection.conf       # 本项目
│   └── libretv.conf             # 另一个项目，共用网关，互不干扰
└── snippets/
    ├── gzip.conf
    ├── proxy_common.conf
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

网关配置在仓库里有一份逐字节镜像：`deploy/nginx/`（服务器整机重装时据此恢复，
见下面「nginx 网关配置」一节）。

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

## 账号运维

### 忘记密码怎么重置

本站不发邮件，重置链接在服务器上生成：

```bash
ssh huawei-flexus
cd /opt/apps/my-collection/api
sudo -u mybook env $(grep -v '^#' /opt/apps/my-collection/deploy/.env | xargs) \
  node dist/reset.js 你的邮箱
```

输出一个 `#/reset?token=...` 链接，粘到地址栏打开即可设新密码。规则：

- **15 分钟有效，且只能用一次**（用掉即删，库里只存 sha256，不存明文令牌）
- 成功后该账号所有旧会话立刻失效，其他设备需要重新登录
- 重复执行会生成新链接，旧链接不作废（各自独立过期）

### 直接改密码（不走页面）

`dist/index.js` 是 ESM，没法 `require` 拿 `hashPassword`。直接用同样的 scrypt 参数生成：

```bash
HASH=$(node -e '
const { randomBytes, scryptSync } = require("node:crypto");
const N=16384, R=8, P=1, KEY_LEN=64;
const salt = randomBytes(16);
const key = scryptSync(process.argv[1], salt, KEY_LEN, { N, r: R, p: P });
console.log(`scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`);
' '新密码')

sudo -u postgres psql -d mybook \
  -c "UPDATE users SET password_hash='$HASH' WHERE email='xxx@yyy';"
```

参数 `N=16384, r=8, p=1, KEY_LEN=64` 必须和 `apps/api/src/auth.ts` 一致，改一边要改另一边。

### 登录限流

`login_attempts` 表记录失败次数，双维度限制：

| 维度 | 阈值 | 说明 |
|---|---|---|
| 邮箱 | 15 分钟内错 5 次 | 锁的是这个账号 |
| IP | 15 分钟内错 20 次 | 锁的是这台机器，防换邮箱扫号 |

被锁返回 **429**，且**锁定期内即使密码正确也拒绝**（否则锁定形同虚设）。
登录成功会清掉该邮箱的失败计数。

**已知取舍**：按邮箱锁意味着知道别人邮箱的人能故意把他锁 15 分钟（拒绝服务）。
阈值定在 5 次是为了「难被猜中又不轻易误伤」，锁死时间也只有 15 分钟。
若以后觉得误伤多，改 `apps/api/src/ratelimit.ts` 里的 `EMAIL_LIMIT`。

### 解锁某人 / 清空限流记录

```bash
sudo -u postgres psql -d mybook -c "DELETE FROM login_attempts WHERE email='xxx@yyy';"
sudo -u postgres psql -d mybook -c "DELETE FROM login_attempts;"   # 全部清空
```

### 查看谁在试密码

```bash
sudo -u postgres psql -d mybook -c "
SELECT email, ip, count(*) AS 失败次数, max(created_at) AS 最近一次
FROM login_attempts WHERE NOT succeeded
GROUP BY email, ip ORDER BY 失败次数 DESC LIMIT 20;"
```

## 批量操作

前端：切到**列表视图**（右上角三横线图标）→ 点「多选」→ 勾选条目 → 用「移动到分组…」或「删除」。

注意多选按钮**只在列表视图出现**。网格/磁贴视图的卡片上没有复选框锚点，硬加会逼出新的交互形态，所以没做。

后端接口（越权防护在 SQL 的 `user_id = $1` 条件里，不是应用层判断）：

| 方法 | 路径 | 说明 |
|---|---|---|
| `PATCH` | `/bookmarks/bulk` | `{ids: string[], patch: {collectionId: string \| null}}`，null = 移出分组 |
| `POST` | `/bookmarks/bulk-delete` | `{ids: string[]}` |

两个接口都返回受影响行数（`updated` / `deleted`），**不属于自己的 id 会被静默忽略**，不报错也不生效。
「移动到别人的分组」则直接 404（`assertOwnCollection` 校验）。

验证方式：

```bash
# 换成自己的 cookie
curl -b cookie.txt -X PATCH http://121.36.46.119/api/v1/bookmarks/bulk \
  -H 'Content-Type: application/json' \
  -d '{"ids":["<id1>","<id2>"],"patch":{"collectionId":"<分组id>"}}'
# → {"updated":2}
```

## 发布新版本

前端与后端产物都在 `apps/` 下（仓库没有根级 `dist/`），后端代码没改时只发前端即可：

```bash
# 本地构建
pnpm -r build                      # → apps/web/dist/ + apps/api/dist/

# 前端：先备份旧版再替换（rsync 会自动清理旧 hash 文件）
ssh huawei-flexus 'mkdir -p /var/www/.bak && mv /var/www/my-collection /var/www/.bak/my-collection-$(date +%Y%m%d-%H%M%S)'
rsync -az --delete apps/web/dist/ huawei-flexus:/var/www/my-collection/
ssh huawei-flexus 'chown -R root:www-data /var/www/my-collection \
  && find /var/www/my-collection -type d -exec chmod 755 {} + \
  && find /var/www/my-collection -type f -exec chmod 644 {} +'

# 后端：替换 api/dist 后重启
rsync -az --delete apps/api/dist/ huawei-flexus:/opt/apps/my-collection/api/dist/
ssh huawei-flexus 'systemctl restart mybook-api'
```

**回滚**：把 `/var/www/.bak/my-collection-<时间戳>` 换回来，或 `systemctl restart` 旧版本。

## nginx 网关配置

站点配置在 `/opt/gateway/nginx/sites/my-collection.conf`，由 `/etc/nginx/nginx.conf`
的 `include /opt/gateway/nginx/sites/*.conf;` 加载；`snippets/` 下的 gzip、
proxy_common、security-headers 是整机多项目共用的。

仓库 `deploy/nginx/` 保存了这些文件的**逐字节镜像**，服务器重装时据此恢复。
同步方法、两个方向的操作、以及这份配置里每条 location 为什么这么写，
见 [`deploy/nginx/README.md`](./nginx/README.md)。

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
| `PUBLIC_BASE_URL` | `http://121.36.46.119` | 可选。只用于 `reset.js` 拼完整重置链接；不设则只输出令牌 |

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

## 补充：账号安全功能上线验证（2026-10-24 15:30）

新版本（提交 `ed08cb2`）上线后实测：

```
迁移
  node dist/migrate.js                             → 已应用 0002_login_attempts.sql / 0003_password_resets.sql
  表                                                 → 7 张（新增 login_attempts、password_resets）

登录限流（同一邮箱连发错误密码，阈值 5 次/15 分钟）
  第 1–5 次                                         → 401 邮箱或密码不正确
  第 6 次                                           → 429 该邮箱尝试次数过多，请 15 分钟后再试
  第 7 次                                           → 429
  被锁后用【正确】密码                               → 429（锁定生效，没被绕过）

密码重置
  node dist/reset.js <邮箱>                          → 输出 #/reset?token=... 链接
  GET  /api/v1/auth/reset?token=<有效>               → 200 {"email":"..."}
  POST /api/v1/auth/reset {token,newPassword}        → 204
  同一令牌再提交                                     → 400 链接已失效
  伪造令牌 GET                                       → 400 链接已失效
  新密码登录                                         → 200
  旧密码登录                                         → 401

前端
  /                                                  → 200 1702B
  /assets/index-BXj33Jkr.js                          → 200 417377B
  /assets/index-rgHP-3lM.css                         → 200 50018B
  /avatar-112.png                                    → 200 20498B
  /reset?token=x（SPA 深路由）                        → 200

依赖
  pnpm audit --prod                                  → No known vulnerabilities found
```

测试数据已清理（`users` 只剩真实账号 1 个，`login_attempts` 归零）。

回滚点：
- 前端 `/var/www/.bak/my-collection-20261024-153011`
- 后端 `/opt/apps/.bak/api-dist-20261024-153011`
- 代码 `git revert ed08cb2`

**注意**：回滚后端到旧版本时，`login_attempts` / `password_resets` 两张表留着无害（旧代码不读），
但**回滚前端后 `/reset` 路由不存在**，重置链接会 404。

## 补充：批量操作线上验证（2026-10-24 15:45）

```
PATCH  /bookmarks/bulk {ids:[3条], patch:{collectionId:<分组>}}  → 200 {"updated":3}
GET    /library                                                  → 3 条全部归属该分组
PATCH  /bookmarks/bulk {ids:[3条], patch:{collectionId:null}}     → 200 {"updated":3}
GET    /library                                                  → 3 条 collectionId 字段消失（无分组）
POST   /bookmarks/bulk-delete {ids:[2条]}                         → 200 {"deleted":2}
GET    /library                                                  → 剩 1 条

跨用户越权（账号 B 拿账号 A 的书签 id）
POST   /bookmarks/bulk-delete {ids:[<A的id>]}                     → 200 {"deleted":0}
GET    /library（A 视角）                                         → 1 条，一条没少
PATCH  /bookmarks/bulk 移动到 B 自己以外的分组                     → 404

前端（Playwright 实测 1280×900）
  列表视图点「多选」                                              → 出现批量条「已选 0 / 3」
  勾选 2 项                                                       → 「已选 2 / 3」，行高亮
  「移动到分组…」下拉                                             → 含各分组 + 「移出分组（回到全部）」
  多选期间视图切换按钮                                            → 禁用，title=「多选模式下不可切换视图」
```

测试账号已全部清理，`users` 只剩真实账号 1 个（149 条书签 / 6 个分组）。
