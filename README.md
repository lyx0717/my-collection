# 狗蛋书签

个人书签收藏网站：**存得快、找得到、点得开**。精致卡片风的高效率书签库，**按账号登录、数据存在自己的服务器上**。

- 前端：React 18 + Vite + TypeScript + Tailwind CSS v4 + React Router（Hash 模式）
- 后端：Fastify + PostgreSQL（`apps/api`）
- 旧版（纯浏览器本地存储）的静态站仍由 `new-UI` 分支维护：<https://lyx0717.github.io/my-collection/>

## 功能

**书签库（首页）**

- 顶部通栏固定导航（Logo / 搜索引擎 / 设置），搜索框固定上限 380px，宽屏不撑满
- **「添加书签」按钮位于内容工具条右侧**，与多选、视图切换同组
  （顶栏离内容上下文太远，用户要加书签时视线在卡片区）
- **二级导航为悬浮固定胶囊**（sticky 吸在顶栏下方），宽度按内容自适应并居中；首页分组导航用带图标的 `CapsuleNav`
- **导航材质与卡片分层**：导航底色更实（浅 `rgba(255,255,255,.66)` / 深 `rgba(30,30,32,.6)`）、
  描边接近不透明（.95 / .2）、投影更重，保证悬浮控件从内容里立得住
- **分组图标为 lucide SVG**（24 枚候选，设置页可视化选择），
  未指定时按分组名 hash 稳定分配一个；不使用 emoji
- 分组导航只做点击切换；分组的增删改与拖拽排序在设置页
- **列表 / 网格 / 磁贴**三视图切换（偏好本地记忆）；**编辑、删除、拖拽排序只在列表视图可用** ——
  网格与磁贴是纯浏览视图，不渲染操作按钮，也不挂拖拽把手
- **玻璃只给悬浮控件用**：顶栏、分组胶囊、账号菜单、弹窗、Toast 走
  `backdrop-filter: blur(10px) saturate(180%)`（弹窗 24px）+ 半透明白底 + 1px 亮描边；
  卡片 / 行 / 磁贴刻意用**实底 + 冷灰描边** —— 同屏四十多个 backdrop 层会让滚动每帧重采样，
  掉帧比「不够玻璃」难看得多（判断标准是同屏实例数，不是「该不该叫玻璃」）
- 圆角分档：行与弹窗 20px、网格卡 16px、磁贴 12px；
  浅色 `#f2f2f7` 底 / 深色 `#000` 底，主色统一 `#0a84ff`，
  无噪点纹理、无氛围光晕、无发光效果
- 库内筛选：标题、域名、描述、URL 多词「且」匹配；`⌘K / Ctrl+K` 或 `/` 聚焦
- 顶部互联网搜索引擎：百度 / 必应 / Google / 自定义（`%s` 占位）
- 按分组 / 域名筛选；筛选状态写入 URL
- 排序：最新收录 / 最早收录 / 标题 A→Z
- **批量操作**（列表视图）：多选后移动分组、删除
- **同域名批量归类**：按域名筛选后一键把该域名书签移入分组
- 没有分组的书签直接出现在「全部」里，不单列视图
- favicon：展示时按域名解析（历史图标 → 站点 `/favicon.ico` → 名称首字徽章），不依赖抓取额度
- 快捷键：`N` 新建、`Esc` 关闭弹窗/清空搜索
- 无障碍：尊重 `prefers-reduced-motion` 与 `prefers-reduced-transparency`（玻璃降级为实色）

**添加书签**

- 粘贴 / 输入链接后自动通过 Microlink 抓取标题、描述、封面、图标（免费 25 次/天；失败静默降级为手填）
- 相同 URL 自动判重：已收藏过会拦住，并给出「去编辑它」的出路

**账号**

- 邮箱 + 密码登录，密码以 `scrypt` 哈希入库；同一页可切到「注册」，注册完直接是登录态
- 会话 30 天（HttpOnly Cookie，`SameSite=Lax`），过期或退出后回到登录页
- **登录限流**：同一邮箱 15 分钟内失败 5 次、同一 IP 失败 20 次即暂时锁定；
  计数落在数据库里（重启服务不清零），且先判限流再算哈希，不白烧 CPU
- **忘记密码**：服务器不配 SMTP，改由管理员在机器上跑
  `node dist/reset.js <邮箱>` 生成一次性重置链接（15 分钟有效，用完即废），私下发给本人

**书签小工具**

设置页里有可拖到书签栏的按钮，之后在任何网页点一下就能带着网址和标题直接收藏，无需装扩展。
拖拽在无书签栏的浏览器里会失败，同一处也给了手动新建书签的代码。
它的落地页是 `#/add?u=<url>&t=<title>` 深链（未登录时先登录，登录后自动回到该深链）。

**设置页**

- **外观**：浅色 / 深色 / 跟随系统（界面固定为玻璃风格，不可切换）
- **数据**：导入浏览器 HTML、iTab `.itabdata`、Raindrop / Linkding / 本站的 JSON 与 CSV；
  导出 JSON 或浏览器书签 HTML
- **书签小工具**：见上
- **分组管理**：新建 / 编辑 / 删除 / 拖拽排序（首页导航只读，这里是唯一的分组管理入口）
- 清空全部数据

设置页顶部为通栏固定导航 + 悬浮文字胶囊分段控件，与首页分组导航同一套视觉语言。

## 数据存在哪？

PostgreSQL，按 `user_id` 隔离 —— 每条 SQL 都带 `WHERE user_id = $1`，且该参数一律取自会话、不信任请求体。

- 换设备：登录同一账号即可看到全部数据
- 备份：设置页 **导出 JSON**，或直接 `pg_dump`
- 从旧版迁过来：本机若有旧的 `mybookmarks:v4`，首次登录且账号书库为空时首页会出现导入横幅；
  **只有服务端确认写入成功才清除本地数据**，失败会原样保留
- 主题 / 视图 / 搜索引擎属于设备偏好，仍然存在 localStorage，与账号无关

## 本地开发

需要 Node.js 18+、pnpm，以及一个本地 PostgreSQL。

```bash
cp .env.example .env   # 按需改数据库连接串
pnpm install

pnpm db:up             # 起本地 Postgres
pnpm migrate           # 建表
pnpm dev               # 同时起前端(5173) 与后端(3000)

pnpm test              # 单测；后端集成测试连不上库时会自动跳过
pnpm typecheck         # 三个包一起类型检查
pnpm -r build          # 生产构建（web → apps/web/dist，api → apps/api/dist）
```

**本地 Postgres 两种起法，任选其一：**

- **Docker** —— `pnpm db:up` 走 `dev/docker-compose.yml`。
- **Homebrew** —— 装好 `postgresql@16` 后用它自己的命令。注意该 formula 是 keg-only，
  `psql` / `pg_ctl` 不在 PATH 里，要么写全路径，要么自己把
  `/opt/homebrew/opt/postgresql@16/bin` 加进 PATH：

  ```bash
  PG=/opt/homebrew/opt/postgresql@16/bin
  $PG/pg_ctl -D /opt/homebrew/var/postgresql@16 start   # 起
  $PG/pg_ctl -D /opt/homebrew/var/postgresql@16 stop    # 停
  ```

  首次使用需要初始化数据目录并建库：

  ```bash
  PG=/opt/homebrew/opt/postgresql@16/bin
  $PG/initdb -D /opt/homebrew/var/postgresql@16 -E UTF8 --locale=C
  $PG/psql -d postgres -c "CREATE ROLE mybook LOGIN PASSWORD 'mybook'"
  $PG/psql -d postgres -c "CREATE DATABASE mybook OWNER mybook"
  ```

前端请求的是站内绝对路径 `/api/v1`（`apps/web/src/lib/api.ts`），开发时由 Vite 代理到 3000 ——
浏览器视角始终同源，所以既不需要 CORS，也不需要任何 `VITE_*` 环境变量。
代价是**前端必须挂在站点根路径**（`base: './'` 只管资源路径，管不了这个写死的 `/api/v1`）。

## 部署

线上跑在**华为云 Flexus 应用服务器**（<http://121.36.46.119>）：宿主机 nginx 同源提供前端静态文件 + 反代 `/api`，
后端由 systemd 托管，数据库是同机的 PostgreSQL。完整运维手册见
[`deploy/HUAWEI-CLOUD.md`](./deploy/HUAWEI-CLOUD.md)；网关配置在 [`deploy/nginx/`](./deploy/nginx/)（与服务器上
`/opt/gateway/nginx/` 逐字节同步），首次装机脚本是 [`deploy/install-huawei.sh`](./deploy/install-huawei.sh)。

> **域名与备案**：目前只能按 IP 直访 —— 站点 `server_name` 是 IP，没有域名、没有 HTTPS，ICP 备案尚未提交。
> 备案填表文案见 [`deploy/BEIAN.md`](./deploy/BEIAN.md)；备案通过后要做的服务器侧改动（域名、443、证书、
> `COOKIE_SECURE=true`、`PUBLIC_BASE_URL`）写在 HUAWEI-CLOUD.md 的「备案与域名」一节。

旧版静态站仍由 `new-UI` 分支跟随 GitHub Pages 自动发布（`.github/workflows/deploy.yml`），与本分支互不影响。

> 分支说明：`feat/backend` 是后端长期独立分支，`new-UI` 是旧版纯前端；当前线上代码来自
> `feat/new-ui-merge`（`new-UI` 的界面改动已合入这份全栈代码）。

## 目录结构

```
apps/web/                        # 前端（React + Vite）
├── index.html                   # 含防白闪脚本：渲染前先挂 data-theme
├── vite.config.ts               # base: './'；开发时把 /api 代理到 3000
└── src/
    ├── types.ts                 # 再导出 packages/shared 的领域类型 + 前端专有类型
    ├── store/                   # AuthContext / BookmarksContext / AppearanceContext
    ├── lib/                     # api、url、netscape、importFile、localStore、bookmarklet、motion…
    ├── hooks/
    ├── components/              # 含 RequireAuth、LocalMigrationBanner、settings/* 各区块
    └── pages/                   # HomePage、LoginPage、SettingsPage

apps/api/                        # 后端（Fastify + PostgreSQL，ESM）
├── migrations/                  # 纯 SQL 迁移 + runner
│   ├── 0001_init.sql            # 用户 / 书签 / 分组 / 会话
│   ├── 0002_login_attempts.sql  # 登录失败计数（限流）
│   └── 0003_password_resets.sql # 一次性密码重置令牌
└── src/
    ├── app.ts  index.ts  config.ts  errors.ts
    ├── db.ts                    # 连接池 + query + withTransaction
    ├── auth.ts                  # scrypt 哈希 + 会话 + requireAuth 钩子
    ├── ratelimit.ts             # 邮箱 / IP 双阈值，先判限流再验哈希
    ├── migrate.ts               # 迁移入口（tsup 另外产出 dist/migrate.js）
    ├── cli/reset.ts             # 命令行生成一次性重置链接（tsup 产出 dist/reset.js）
    ├── validate.ts
    └── routes/                  # auth / bookmarks / collections

packages/shared/                 # 前后端共享的领域类型与 URL 工具
dev/docker-compose.yml           # 本地开发用 Postgres
design/                          # UI-PLAN（界面与材质规范）/ DARK-MODE（主题机制）/ MOTION（动效基线）
deploy/                          # HUAWEI-CLOUD.md（线上手册）/ BEIAN.md（备案文案）
                                 # nginx/（网关配置镜像）/ install-huawei.sh（首次装机）
.github/workflows/deploy.yml     # 旧版静态站（new-UI 分支）自动发布到 GitHub Pages
promo/                           # 宣传物料，不参与运行
```
