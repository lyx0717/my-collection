# 华为云 Flexus 部署（多项目托管架构）

生产地址：<http://121.36.46.119/>

> 本文档最近一次与线上逐条核对：**2026-11-06**。核对用的是只读命令，实测值和命令见文末
> 「附录：2026-11-06 线上核对快照」。文中标「（历史记录）」的验证段落是当时的运维证据，
> 保留不改；**当前状态以正文和附录为准**。

## 架构

```
互联网 → 华为云安全组(→ 控制台确认) → ufw(22/80/443/8080)
                                      ├─ :80   nginx 网关（本项目唯一入口）
                                      │        ├─ /      → /var/www/my-collection（前端静态）
                                      │        └─ /api/  → 127.0.0.1:3000（Fastify，systemd mybook-api）
                                      │                        └─ 127.0.0.1:5432（PostgreSQL 16）
                                      └─ :8080 docker-proxy → libretv 容器（同机另一个项目，不经 nginx）
```

**my-collection 自身没有任何服务直接暴露端口**：API 进程与数据库全部绑定 `127.0.0.1`
（`ss -lntp` 实测 `127.0.0.1:3000` / `127.0.0.1:5432`），本项目只有 nginx 监听 `0.0.0.0:80`。

**但这台机器上另一个项目把 8080 直接暴露到公网**：`docker ps` 显示 libretv 容器
`0.0.0.0:8080->8080/tcp`，公网实测 `curl http://121.36.46.119:8080/` 返回 200（真实 LibreTV 页面）。
所以「整机没有任何服务暴露端口」不再成立，详见「已知事项」。

ufw 实测放行：`22 / 80 / 443 / 8080`（443 已放行但 nginx 没监听，见「备案与域名」）。
**华为云安全组的具体放行规则无法从机内核实**（没有 hwcloud CLI），需到控制台确认。

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
| 容器端口 | 无容器 | `8080`（libretv docker） | 宿主机端口直接映射，不经网关 |

**端口规划**：`3000-3099` 给后端 API，`3100-3199` 预留其他服务。nginx 是唯一占用 80/443 的进程。

**域名规划**：现在用 IP 访问，站点 `server_name 121.36.46.119 my-collection.local`（实测）。
有域名后在同一份 conf 里追加 `server_name example.com;` 即可，不影响其他站点；
HTTPS 的技术动作 + 备案流程见「[备案与域名](#备案与域名)」一节。

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

/var/www/.bak/                   # 前端历史版本（回滚用，目录名带时间戳）
/opt/apps/.bak/                  # 后端 dist 历史版本（回滚用）
/srv/data/backups/               # 数据库备份：daily/ weekly/ monthly/
/var/log/gateway/                # 网关日志（按站点分文件）
/etc/systemd/system/mybook-api.service
/etc/cron.d/mybook-backup        # 每日 03:20 备份
/usr/local/bin/mybook-backup.sh  # 备份脚本本体
```

仓库侧的对应物（都不在服务器上）：

| 仓库路径 | 作用 | 与服务器的关系 |
|---|---|---|
| `deploy/nginx/` | 网关配置镜像 | `/opt/gateway/nginx/` 的逐字节副本，整机重装时据此恢复 |
| `deploy/install-huawei.sh` | 首次部署脚本（幂等） | 在**本机**跑，通过 ssh 推产物到服务器 |
| `deploy/BEIAN.md` | 备案填表文案 | 纯文本，不部署到服务器 |
| `deploy/HUAWEI-CLOUD.md` | 本文 | 同上 |

`deploy/nginx/` 镜像于 2026-11-06 用 `diff` 逐文件比对过，与线上**完全一致**
（含 `snippets/` 三个 snippet）。同步方法与恢复步骤见 `deploy/nginx/README.md`。

## 运行环境（2026-11-06 实测）

| 项 | 值 | 核对方式 |
|---|---|---|
| 操作系统 | Ubuntu 22.04.5 LTS | `. /etc/os-release` |
| nginx | 1.18.0 (Ubuntu) | `nginx -v` |
| Node.js | v22.23.4（`/usr/bin/node`） | `node -v` |
| PostgreSQL | 16.15（Ubuntu 16.15-1.pgdg22.04+2） | `psql --version` |
| Docker | 29.1.3 | `docker --version`（只跑 libretv 容器） |
| CPU / 内存 | 2 核 / 1.7 GiB + 2 GiB swap | `nproc` `free -h` |
| 磁盘 | 系统盘 40 G，已用 30% | `df -h /` |
| 主机名 | `hcss-ecs-c3f9` | `hostname` |

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

输出的是 `/#/reset?token=...`。**当前 `.env` 里没有 `PUBLIC_BASE_URL`**，所以只输出相对路径，
要自己拼上站点地址 → `http://121.36.46.119/#/reset?token=...`，粘到地址栏打开即可设新密码
（配了 `PUBLIC_BASE_URL` 才会直接输出完整链接）。规则：

- **15 分钟有效，且只能用一次**（用掉即删，库里只存 sha256，不存明文令牌）；
  时长可用 `--minutes N` 改（1–1440）
- 成功后该账号所有旧会话立刻失效，其他设备需要重新登录
- **重复执行会让旧链接立即作废**：脚本每次先 `DELETE FROM password_resets WHERE user_id = $1`，
  只保留最新一条令牌（源码 `apps/api/src/cli/reset.ts`）
- 账号不存在时直接报错并列出可用账号，不静默成功

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
登录成功会清掉该邮箱的失败计数，但**成功也会写一条 `succeeded=true` 的记录**，
所以 `login_attempts` 平时不是空的；明细只保留 7 天（`ATTEMPT_RETENTION_DAYS`）。

**已知取舍**：按邮箱锁意味着知道别人邮箱的人能故意把他锁 15 分钟（拒绝服务）。
阈值定在 5 次是为了「难被猜中又不轻易误伤」，锁死时间也只有 15 分钟。
若以后觉得误伤多，改 `apps/api/src/ratelimit.ts` 里的常量（实测名称为
`EMAIL_MAX_FAILS=5` / `IP_MAX_FAILS=20` / `WINDOW_MINUTES=15`）。

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
| `POST` | `/bookmarks/bulk` | `{drafts: [...]}` 批量**导入**，重复的跳过，返回 `{created, skipped, bookmarks}`（另一个同路径接口，别和 PATCH 搞混） |

批量改 / 删两个接口都返回受影响行数（`updated` / `deleted`），**不属于自己的 id 会被静默忽略**，不报错也不生效。
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

**线上实况（2026-11-06 核对）**：

- 站点只监听 `80` / `[::]80`，**没有 443、没有证书**；`server_name 121.36.46.119 my-collection.local;`
- `/etc/nginx/nginx.conf:60` 定义限流桶 `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;`，
  站点内 `/api/` 用 `limit_req zone=api burst=20 nodelay`；`location = /api/v1/healthz` 在其之前且不限流
- `00-default.conf` 是 `default_server`，未知 Host 一律 404；`libretv.conf` 是另一个项目
  （`server_name yinghe.local`，反代 `127.0.0.1:8080`）
- `diff <(ssh huawei-flexus 'cat /opt/gateway/nginx/sites/my-collection.conf') deploy/nginx/my-collection.conf`
  → 无差异；三个 snippet 同样无差异
- `/etc/nginx/sites-enabled/` 是空目录，生效配置只来自 `/opt/gateway/nginx/sites/*.conf`

## 备案与域名

### 现状（2026-11-06）

| 项 | 现状 | 核对方式 |
|---|---|---|
| 访问方式 | 仅公网 IP 直访 `http://121.36.46.119/` | `curl -I http://121.36.46.119/` → 200 |
| 域名 | **无**，`server_name` 只有 IP + `my-collection.local` | `cat sites/my-collection.conf` |
| HTTPS | **无**：443 无监听、无证书 | `ss -lntp` 无 443；`curl https://121.36.46.119/` 失败 |
| 备案 | **未备案**（个人非经营性站点，纯自用） | 无域名即无需备案；管局侧状态未核查 |
| 内容性质 | 个人书签管理，无广告 / 无付费 / 无交易 / 无发帖 | 与 `deploy/BEIAN.md` 一致 |

站点性质定性、网站名称、简介等填表文字见 `deploy/BEIAN.md`；**本文只管服务器 / nginx / 后端侧动作**。

### ICP 备案前置（域名到手前就要做对）

1. **域名持有者必须与备案主体一致**（本人实名认证，信息要与身份证一致）；
   在境内注册商买域名更省事，`.com/.cn/.net` 最稳，冷门后缀先确认能不能备案。
2. 在华为云控制台申请**备案服务号**（每台服务器有额度），再按引导提交资料、做核验。
3. **首次备案期间不要先把域名解析上线**：管局会核验网站，域名提前解析访问容易被驳回。
   这段时间站点继续用 IP 访问，不需要改任何配置。
4. 备案要求网站内容与申报一致。当前站点需要登录才能看到书签页，
   申报时按 `deploy/BEIAN.md` 的定性写；若要改成公开注册，先想清楚内容责任。

### 备案通过后的技术动作（checklist，逐条可执行）

```bash
# 0) 前提：域名已备案通过，A 记录已解析到 121.36.46.119，dig 能查到
dig +short example.com        # → 121.36.46.119
```

- [ ] **① 页脚加 ICP 备案号并链接管局**（法定要求，首页底部可见）
      前端**目前没有页脚组件**（全局 grep 无 footer），需要在 `apps/web/src/pages/HomePage.tsx`
      列表底部新增一行（登录页可不加，管局看的是访问首页能被"看到"的备案信息）。
      号码照抄管局/华为云下发的，**不要自己编**，形如：
      `<a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">&lt;省份简称&gt;ICP备XXXXXXXX号-1</a>`，
      然后按「发布新版本」重新构建前端（备案号必须在**首页底部可见**，且链接指向管局网站）。
- [ ] **② nginx 加域名 + 443 + 证书 + HTTP→HTTPS 跳转**
      改 `deploy/nginx/my-collection.conf`（改完按 `deploy/nginx/README.md` 推到服务器）：

      ```nginx
      # 新增：80 只负责跳转
      server {
          listen 80;
          listen [::]:80;
          server_name example.com;
          return 301 https://$host$request_uri;
      }

      # 原 80 站点改成 443（保留 IP 直访的那份，或整体合并）
      # 注意：线上 nginx 是 1.18，HTTP/2 要写在 listen 里（`http2 on;` 是 1.25+ 语法）
      server {
          listen 443 ssl http2;
          listen [::]:443 ssl http2;
          server_name example.com;
          ssl_certificate     /etc/nginx/ssl/example.com/fullchain.pem;
          ssl_certificate_key /etc/nginx/ssl/example.com/privkey.pem;
          # ...原有 location 段整体照搬...
      }
      ```

      证书两条路，选一条。**顺序都是「先拿证书，再开 443」**，否则 `nginx -t` 会因为
      证书文件不存在而失败：

      - **华为云证书**（最省事，适合不想折腾 ACME 的情况）：控制台申请/上传 → 下载 nginx 格式
        → 服务器上放 `/etc/nginx/ssl/example.com/`（`fullchain.pem` + `privkey.pem`，`600 root:root`），
        上面的 `ssl_certificate` 路径就按这个写。**有效期 1 年，到期前要回控制台续**。
      - **certbot**：先只把域名的 80 站点加好（`server_name example.com`，不写 443），
        再 `apt install certbot python3-certbot-nginx -y && certbot --nginx -d example.com`；
        证书会落在 `/etc/letsencrypt/live/example.com/`，`ssl_certificate` 改成
        `.../fullchain.pem`、`ssl_certificate_key` 改成 `.../privkey.pem`。
        certbot 会自动加 80→443 跳转并装好续期 timer（`systemctl list-timers | grep certbot` 可查）。

      上线前先自查：`nginx -t` 通过才 reload，失败不要 reload（当前进程会继续用旧配置）。

      ```bash
      ssh huawei-flexus 'nginx -t && systemctl reload nginx'
      curl -I https://example.com/            # → 200
      curl -I http://example.com/             # → 301
      ```
- [ ] **③ 后端 `COOKIE_SECURE=true`**
      `sed -i 's/^COOKIE_SECURE=false/COOKIE_SECURE=true/' /opt/apps/my-collection/deploy/.env`
      改完必须 `systemctl restart mybook-api`。代码在 `COOKIE_SECURE=true` 时会把 cookie 名
      自动切成 `__Host-sid`（`apps/api/src/auth.ts:16`），不用另外加前缀。
      **顺序很重要**：先让 HTTPS 能访问，再改这个值；反了会导致登录后立刻跳回登录页。
- [ ] **④ 新增 `PUBLIC_BASE_URL`（指向新域名）**
      当前 `.env` **没有**这个变量（实测只有 5 个键），需要新增一行：

      ```bash
      ssh huawei-flexus "echo 'PUBLIC_BASE_URL=https://example.com' >> /opt/apps/my-collection/deploy/.env \
        && ls -l /opt/apps/my-collection/deploy/.env && systemctl restart mybook-api"
      ```

      追加不会改权限（应仍是 `-rw-r----- root:mybook`，`ls -l` 顺手确认一下）。
      它只影响 `node dist/reset.js` 拼重置链接（设了才输出完整 URL）。
      另外记得在 `deploy/BEIAN.md` 的「事实清单」里同步站点地址。
- [ ] **⑤ 验证整链路**
      ```bash
      curl -I https://example.com/                       # 200
      curl    https://example.com/api/v1/healthz         # {"ok":true}
      curl -I http://example.com/                        # 301 → https
      # 浏览器登录一次，确认 DevTools 里 cookie 名是 __Host-sid 且带 Secure
      ```
- [ ] **⑥ 公安联网备案**：网站**开通后 30 日内**到全国互联网安全管理服务平台登记，
      通过后页脚再加一行公安备案号（同样带链接）。这条是法定义务，别忘了。

> 域名切换期间旧 IP 地址仍可访问（keep-alive 与书签里的旧链接都还能用）；
> 若想强制收敛到域名，把原 80 站点改成 `return 301 https://example.com$request_uri`。

## 环境变量

见 `/opt/apps/my-collection/deploy/.env`（`-rw-r-----` root:mybook，208 B，**实测只有 5 个键**）：

| 变量 | 当前值 | 说明 |
|---|---|---|
| `DATABASE_URL` | `postgres://mybook:<随机>@127.0.0.1:5432/mybook` | 唯一数据库配置源 |
| `DB_PASSWORD` | `<随机 48 位十六进制>` | 与上面保持一致 |
| `PORT` | `3000` | 下个项目用 3001 |
| `HOST` | `127.0.0.1` | **不要改成 0.0.0.0**，只让 nginx 反代 |
| `COOKIE_SECURE` | `false` | **纯 http 必须 false**，设 true 会导致登录后立刻跳回登录页 |
| `NODE_ENV` | **未设置** | 代码里不读它（`apps/api/src/config.ts` 无该字段），加了也没行为差异 |
| `PUBLIC_BASE_URL` | **未设置** | 可选。只用于 `reset.js` 拼完整重置链接；不设则只输出相对路径 |

后端**不读任何 `.env` 文件**（无 dotenv），只认进程环境变量。systemd 通过 `EnvironmentFile=` 注入。
手动前台启动必须自己 `export` 或 `set -a; . .env; set +a`。

核对方式（只读，不打印密钥）：

```bash
ssh huawei-flexus 'wc -l /opt/apps/my-collection/deploy/.env; \
  sed -E "s/^(DB_PASSWORD|DATABASE_URL)=.*/\1=<masked>/" /opt/apps/my-collection/deploy/.env'
ssh huawei-flexus 'tr "\0" "\n" < /proc/$(systemctl show -p MainPID --value mybook-api)/environ | grep -c .'
```

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

**当前状态（2026-11-06 核对）**：cron 在跑，最近一次 `mybook-20261106-032001.dump` 成功
（24 650 B）；daily 目录保留 8 份（轮转用的是 `-mtime +7`，所以实际在 8 份左右，不是刚好 7 份）；
weekly 已有 2 份（`mybook-20261025-032001`、`mybook-20261101-032001`）、monthly 1 份（`mybook-20261101-032001`，11-01 恰好是周日又是 1 号）；总占用约 264 KB。
`/srv/data/backups` 权限 `700 root:root`，dump 文件 `600`。

```bash
# 查看备份
ls -t /srv/data/backups/daily/ | head -8
du -sh /srv/data/backups

# 看备份日志（失败也在这里）
journalctl -t mybook-backup -n 20
journalctl -t mybook-backup -p err --since "7 days ago"     # 只看错误

# 手动立即备份
/usr/local/bin/mybook-backup.sh
```

### 恢复演练（已完成，可复现）

> 下面这条命令是**常备可用**的；「2026-10-24 实测结果」是**历史记录** —— 之后上线的迁移
> 让表从 5 张变成 7 张，当前表数量见文末「附录」。

不要等到真出事才第一次恢复。这条命令会把最新备份还原到临时库做校验，**不碰生产库**：

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

**2026-10-24 实测结果（历史记录）**：还原后 5 张表全部就位，与主库表数量一致。
（当时还没上 `login_attempts` / `password_resets` 两个迁移；当前主库 7 张表，
再演练应对齐 7 张。）

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

1. **没有域名 = 没有 HTTPS**（实测 443 无监听、无证书）。当前是纯 http，密码明文过网。
   备案与技术动作见「备案与域名」，涉及真实密码前建议先上域名 + 证书。
2. **数据库密码**已备份到本机 `~/.my-collection-secrets/prod.env`（600，仓库外，不进 git）。建议再抄一份到密码管理器。
3. **自动备份已配置**（见上，最近一次 2026-11-06 03:20 成功），但**未配置异地备份**，靠华为云快照补。
   快照需在控制台手动开启（机内无 hwcloud CLI，无法代劳也无法核实是否已开）。
4. **2 Mbit/s 出网带宽**是体验瓶颈：前端首次加载约 512 KB 约需 0.5–1s，图片/视频会明显慢。
   > 带宽规格**未核对**：机内看不到控制台带宽参数，这是控制台规格，请以控制台为准。
   > 前端当前实际体积：JS 415 932 B + CSS 49 599 B + 按需 chunk（实测 `ls -l /var/www/my-collection/assets`）。
5. 机器 **2 核 1.7 GiB**（实测），已配 2 GB swap；系统盘 40 G 用了 30%。
   API 进程 `MemoryHigh=320M` / `MemoryMax=400M`（`systemctl cat mybook-api` 实测），PG `shared_buffers=256MB`。
   同时再跑第二个重量级项目前，先看 `free -h` 和 `docker`/进程内存占用。
6. `.env` 里 `COOKIE_SECURE=false`（纯 http 必须这样）。上 HTTPS 后改成 `true` 并重启：
   代码会自动把 cookie 名切成 `__Host-sid`（`apps/api/src/auth.ts:16`），**不需要手工加前缀**。
7. **同机 libretv 容器把 8080 直接暴露公网**（`0.0.0.0:8080->8080/tcp`，实测公网 200）。
   它不经 nginx，也就吃不到网关的安全头与限流；本项目本身的 3000/5432 仍只在 `127.0.0.1`。

## 部署完成时的验证记录（2026-10-24，历史记录）

> 以下是当天首次上线时的验收输出，原样保留作为运维证据。当前实测值见「附录」。

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

## 补充：账号安全功能上线验证（2026-10-24 15:30，历史记录）

> 当时的验收输出，原样保留。**其中的前端产物哈希（`index-BXj33Jkr.js` 等）已过期**：
> 2026-11-04 16:01 重新发布过前端，当前哈希见「附录」。

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

测试数据已清理（`users` 只剩真实账号 1 个，`login_attempts` 归零）。（历史记录 —
当前 `users` 仍是 1 个，但 `login_attempts` 会有成功登录留下的行，见「登录限流」和「附录」。）

回滚点：
- 前端 `/var/www/.bak/my-collection-20261024-153011`（实测存在）
- 后端 `/opt/apps/.bak/api-dist-20261024-153011`（实测存在）
- 代码 `git revert ed08cb2`

**注意**：回滚后端到旧版本时，`login_attempts` / `password_resets` 两张表留着无害（旧代码不读），
但**回滚前端后 `/reset` 路由不存在**，重置链接会 404。

## 补充：批量操作线上验证（2026-10-24 15:45，历史记录）

> 当时的验收输出，原样保留。文末的「149 条书签」已过期（当前 150 条），见「附录」。

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

测试账号已全部清理，`users` 只剩真实账号 1 个（当时 149 条书签 / 6 个分组；
2026-11-06 实测 **150 条书签 / 6 个分组**，用户仍 1 个）。

## 附录：2026-11-06 线上核对快照

核对方式：**只读命令**，未部署、未改配置、未 restart、未写库、未删备份。

| 项 | 实测值 | 核对命令 |
|---|---|---|
| 服务状态 | `active (running)`，`Main PID 1878`，自 2026-10-29 10:48:47 CST 起未重启；内存 59.1 M | `systemctl status mybook-api --no-pager` |
| unit 文件 | `/etc/systemd/system/mybook-api.service`，`User=mybook`，`WorkingDirectory=/opt/apps/my-collection/api`，`EnvironmentFile=/opt/apps/my-collection/deploy/.env`，`MemoryHigh=320M`、`MemoryMax=400M`、`Restart=always`、`ProtectSystem=strict` | `systemctl cat mybook-api` |
| 前端产物体积/哈希 | `index.html` 1702 B；`assets/index-Di_DgKjW.js` 415 932 B；`assets/index-uAGX0ql4.css` 49 599 B；`papaparse.min-6yXDjCiT.js`、`SettingsPage-C-pCVmzU.js` 等 chunk | `ls -l /var/www/my-collection /var/www/my-collection/assets` |
| 前端产物时间 | 全部 mtime `2026-11-04 16:01:34`（对应备份 `my-collection-20261104-160143`） | `stat -c '%y %n' /var/www/my-collection/index.html` |
| 后端产物时间 | `dist/index.js` mtime `2026-10-24 15:29:52`（前端发过后端没动） | `stat -c '%y %n' /opt/apps/my-collection/api/dist/index.js` |
| 迁移文件 | `migrations/` 下 3 个 SQL + `run.ts`；`dist/` 下 `index.js`、`migrate.js`、`reset.js` + 2 个 chunk | `ls -l .../api/migrations .../api/dist` |
| 数据库 | PostgreSQL **16.15**，监听 `127.0.0.1:5432` | `psql --version`；`ss -lntp` |
| 表数量 | **7 张**：`bookmarks` / `collections` / `login_attempts` / `password_resets` / `schema_migrations` / `sessions` / `users` | `psql -c "select tablename from pg_tables where schemaname='public'"` |
| 数据量 | `users=1`，`bookmarks=150`，`collections=6`，`login_attempts=1`（一条 `succeeded=true`，2026-11-04 15:58）；最新书签 `created_at=2026-11-03 09:27:39+08` | `psql -c "select count(*) ..."` |
| API 监听 | `127.0.0.1:3000`（node pid 1878） | `ss -lntp` |
| nginx 监听 | `0.0.0.0:80`、`[::]:80`；**无 443** | `ss -lntp` |
| 网关配置镜像 | 与仓库 `deploy/nginx/` **完全一致**（1 个 site + 3 个 snippet，逐文件 `diff` 无差异） | `diff <(ssh huawei-flexus 'cat ...') deploy/nginx/...` |
| 站点配置 | `server_name 121.36.46.119 my-collection.local;`；`location = /api/v1/healthz` 不限流；`/api/` `limit_req burst=20 nodelay`；`/assets/` 一年 immutable；`/index.html` no-store | `cat sites/my-collection.conf` |
| 限流桶 | `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s`（`/etc/nginx/nginx.conf:60`） | `grep -n limit_req_zone /etc/nginx/nginx.conf` |
| 其他站点 | `00-default.conf`（default_server 404）、`libretv.conf`（`server_name yinghe.local` → `127.0.0.1:8080`） | `ls /opt/gateway/nginx/sites` |
| 环境变量 | `.env` 5 个键：`DATABASE_URL` / `DB_PASSWORD` / `PORT=3000` / `HOST=127.0.0.1` / `COOKIE_SECURE=false`；**无 `NODE_ENV`、无 `PUBLIC_BASE_URL`** | `wc -l .env`；`/proc/<pid>/environ` |
| 端口暴露 | 本项目仅 nginx 的 80 对公网；`3000`/`5432` 公网无响应（绑 `127.0.0.1`）；**`8080` 公网可达**（libretv 容器） | `ss -lntp`；`curl http://121.36.46.119:8080/` |
| HTTP 冒烟 | `GET /` → 200 1702 B；`GET /api/v1/healthz` → `{"ok":true}`；`GET /assets/index-Di_DgKjW.js` → 200 415 932 B `application/javascript`；旧哈希 `index-BXj33Jkr.js` → 404 | `curl -I` / `curl` |
| HTTPS | 未启用：`curl https://121.36.46.119/` 失败（连接被重置 / 443 无监听） | `curl -k https://121.36.46.119/` |
| ufw | `active`，放行 `22 / 80 / 443 / 8080`（v4 + v6） | `ufw status` |
| 备份 cron | `/etc/cron.d/mybook-backup` 存在，`20 3 * * * root /usr/local/bin/mybook-backup.sh` | `cat /etc/cron.d/mybook-backup` |
| 备份结果 | 最近 `mybook-20261106-032001.dump` 24 650 B；daily 8 份；weekly/monthly 已有内容；总占用 264 KB | `ls -t /srv/data/backups/daily`；`journalctl -t mybook-backup -n 8` |
| 备份目录权限 | `/srv/data/backups` 700 root:root | `ls -lad /srv/data/backups` |
| 历史备份目录 | 前端：`-20261024-145737`、`-20261024-153011`、`-20261104-090426`、`-20261104-091438`、`-20261104-160143`；后端：`api-dist-20261024-153011`、`orphan-chunk-20261024-153017` | `ls -la /var/www/.bak /opt/apps/.bak` |
| 运行环境 | Ubuntu 22.04.5 / nginx 1.18.0 / Node v22.23.4 / Docker 29.1.3 / 2 核 1.7 GiB + 2 GiB swap / 40 G 盘用 30% | 见「运行环境」表 |
| 主机名 | `hcss-ecs-c3f9`，已开机 8 天 5 小时 | `hostname`；`uptime` |

### 本附录未能核对的项目

| 项 | 为什么核不了 |
|---|---|
| 华为云安全组放行规则 | 机内没有 hwcloud CLI，安全组只在控制台可见；机外探测不可靠（本机这条网络路径对任意端口都返回 TCP 建连成功，控制端口 65500 也一样，属假阳性） |
| 出网带宽 2 Mbit/s | 控制台规格，机内无对应参数（`ss`/`ethtool` 看不到带宽配额） |
| EVS 自动快照是否已开启 | 控制台操作，机内无 CLI 可查 |
| ICP 备案 / 公安备案状态 | 与服务器无关，管局系统侧，需本人登录查询 |
| 恢复演练「7 张表」版本 | 再演练要建临时库（写库），本次限定只读，未复跑；当前以 2026-10-24 的旧记录 + 7 张表的 live 查询为准 |
| 前端多选按钮仅在列表视图 | 需浏览器操作，本次只读核对未跑 Playwright；代码侧 `dragEnabled` 逻辑未改，沿用历史验证 |

### 与历史记录不一致、已就地更正的点

| 位置 | 原说法 | 更正为 |
|---|---|---|
| 架构 | 「没有任何服务直接暴露端口」「安全组(22/80)」 | 本项目不暴露；但 libretv 的 8080 直接对公网（实测 200），ufw 放行 22/80/443/8080 |
| 账号运维 · 重置 | 「重复执行会生成新链接，旧链接不作废」 | 脚本每次先删该用户全部旧令牌，**旧链接立即作废** |
| 账号运维 · 重置 | 「输出一个 `#/reset?token=...` 链接」 | 未设 `PUBLIC_BASE_URL`，只输出相对路径，需自己拼 IP |
| 登录限流 | 「改 `apps/api/src/ratelimit.ts` 里的 `EMAIL_LIMIT`」 | 实际常量名 `EMAIL_MAX_FAILS` / `IP_MAX_FAILS` / `WINDOW_MINUTES` |
| 登录限流 | 未提成功记录 | 成功登录也写一行（`succeeded=true`），明细保留 7 天 |
| 环境变量表 | `NODE_ENV=production`、`PUBLIC_BASE_URL=http://121.36.46.119` | 两个都**未设置**；`.env` 只有 5 个键 |
| 已知事项 · 6 | 「未来上 HTTPS 后…并给 cookie 加 `__Host-` 前缀」 | 代码已实现：`COOKIE_SECURE=true` 时 cookie 自动叫 `__Host-sid` |
| 备份 | 日备「7 天」= 7 份 | `-mtime +7`，实际保留 8 份左右（实测 8 份） |
| 批量操作 | 只列 2 个接口 | 另有 `POST /bookmarks/bulk`（导入 `{drafts}`） |
| 验证记录 | 前端哈希 `index-BXj33Jkr.js` / 149 条书签 / `login_attempts` 归零 | 已标「历史记录」；当前哈希、150 条、1 行成功记录见上表 |
| 目录结构 | 只有服务器目录树 | 补 `/var/www/.bak`、`/opt/apps/.bak`、`/srv/data/backups`、cron 与脚本，并加仓库侧对应物表 |
