# 我的书签 · Bookmarks

个人书签收藏网站：**存得快、找得到、点得开**。精致卡片风的高效率书签库，**按账号登录、数据存在自己的服务器上**。

- 前端：React 18 + Vite + TypeScript + Tailwind CSS v4 + React Router（Hash 模式）
- 后端：Fastify + PostgreSQL（`apps/api`）
- 旧版（纯浏览器本地存储）的静态站仍由 `new-UI` 分支维护：<https://lyx0717.github.io/my-collection/>

## 功能

**书签库（首页）**

- 顶部通栏固定导航（Logo / 搜索引擎 / 设置），搜索框固定上限 380px，宽屏不撑满
- **「添加书签」按钮位于内容工具条右侧**，与多选、视图切换同组
  （顶栏离内容上下文太远，用户要加书签时视线在卡片区）
- **二级导航为悬浮固定胶囊**（sticky 吸在顶栏下方），宽度按内容自适应并居中；
  首页分组导航与设置页导航**共用同一个 `CapsuleNav` 组件**，形态完全一致
- **导航材质与卡片分层**：导航底色更实（浅 0.82 / 深 0.82）、描边更亮、投影更重，
  保证悬浮控件从内容里立得住
- **分组图标为 lucide SVG**（24 枚候选，设置页可视化选择），
  未指定时按分组名 hash 稳定分配一个；不使用 emoji
- 分组导航只做点击切换；分组的增删改与拖拽排序在设置页
- **列表 / 网格 / 磁贴**三视图切换（偏好本地记忆）
- **玻璃为唯一材质**：iOS System Material 规范 —— backdrop 高斯模糊 16px + saturate 180%、
  半透明白底 68%、1px 半透明白描边、20px 大圆角、极淡柔和阴影；
  浅色主题与深色主题各自一套低饱和配色，无噪点纹理、无氛围光晕、无发光效果
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

**书签小工具（bookmarklet）**

设置页有可拖到浏览器书签栏的按钮，在任意网页一键收藏。

**设置页**

- **外观**：浅色 / 深色 / 跟随系统（界面固定为玻璃风格，不可切换）
- **数据**：导入浏览器 HTML、iTab `.itabdata`、JSON/CSV；导出 JSON / Netscape HTML
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

需要 Node.js 18+、pnpm，以及一个本地 PostgreSQL（`dev/docker-compose.yml` 用 Docker 起；装了 Homebrew 的也可以直接 `brew install postgresql@16`）。

```bash
cp .env.example .env   # 按需改数据库连接串
pnpm install

pnpm db:up             # 起本地 Postgres（Docker）
pnpm migrate           # 建表
pnpm dev               # 同时起前端(5173) 与后端(3000)

pnpm test              # 单测；后端集成测试连不上库时会自动跳过
pnpm typecheck         # 三个包一起类型检查
pnpm build             # 生产构建
```

前端始终用相对路径请求 `/api/v1`，开发时由 Vite 代理到 3000 —— 浏览器视角始终同源，
所以既不需要 CORS，也不需要任何 `VITE_*` 环境变量。

## 部署

本分支（`feat/backend`）的目标是部署到自己的服务器（nginx 同源提供前端静态文件 + 反代 `/api`）。
**服务器部署整体后置**，先把本地跑通再统一处理。

旧版静态站仍由 `new-UI` 分支跟随 GitHub Pages 自动发布（`.github/workflows/deploy.yml`），与本分支互不影响。

> 分支说明：`feat/backend` 是长期独立分支，**不合并回 `main` / `new-UI`**。

## 目录结构

```
apps/web/                        # 前端（React + Vite）
├── index.html
├── vite.config.ts               # base: './'；开发时把 /api 代理到 3000
└── src/
    ├── types.ts                 # 再导出 packages/shared 的领域类型 + 前端专有类型
    ├── store/                   # AuthContext / BookmarksContext / AppearanceContext
    ├── lib/                     # api、url、netscape、importFile、localStore…
    ├── hooks/
    ├── components/              # 含 RequireAuth、LocalMigrationBanner
    └── pages/                   # HomePage、LoginPage、SettingsPage

apps/api/                        # 后端（Fastify + PostgreSQL）
├── migrations/                  # 纯 SQL 迁移 + runner
└── src/
    ├── app.ts  index.ts  config.ts  errors.ts
    ├── db.ts                    # 连接池 + query + withTransaction
    ├── auth.ts                  # scrypt 哈希 + 会话 + requireAuth 钩子
    ├── validate.ts
    └── routes/                  # auth / bookmarks / collections

packages/shared/                 # 前后端共享的领域类型与 URL 工具
dev/docker-compose.yml           # 本地开发用 Postgres
```
