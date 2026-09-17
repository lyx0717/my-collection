# 藏物志 · 个人收藏网站

一个深色质感的「私人藏品馆」，用来收拢散落各处的热爱：**影视、美食、文章、网站**。
每件藏品都有博物馆式的登记号（NO.001 …），支持关键词搜索、分类与标签筛选、封面展示和一键跳转原链接，并自带网页内的管理后台增删藏品。

- 技术栈：React 18 + Vite + TypeScript + Tailwind CSS v4 + React Router（Hash 模式）
- 纯前端、无后端、无数据库，藏品保存在浏览器 localStorage
- 深色「藏品馆」视觉：暖墨黑底、铜金点缀、宋体标题、分类色排版封面
- 响应式：手机 2 列、平板 3 列、桌面 4 列

## 功能

**藏品馆（首页 `/`）**

- 藏品总目刊头：四类藏品与总藏品计数
- 关键词搜索：匹配名称、来源、备注、标签；多词以空格分隔表示「且」
- 分类筛选：全部 / 影视 / 美食 / 文章 / 网站（带数量）
- 标签筛选：在当前分类范围内按标签点选，再点一次取消
- 排序：最新收录 / 最早收录
- 卡片：排版式封面（分类渐变色 + 宋体水印汉字 + 登记号），填了封面图链接则显示真图，加载失败自动降级
- 点击卡片打开详情弹层，可一键新标签页访问原链接
- 快捷键：按 `/` 聚焦搜索框，`Esc` 清空或关闭弹层

**馆藏管理（`/#/admin`）**

- 新增 / 编辑 / 删除藏品（删除有二次确认）
- 表单字段：名称（必填）、分类、来源、原链接、封面图链接、标签（逗号分隔）、短评
- 链接格式校验（必须 http/https 开头）
- 导出 JSON 备份、导入 JSON（与已有藏品合并、自动去重）、一键恢复内置示例

## 本地运行

需要 Node.js 18+（推荐使用 pnpm，npm/yarn 亦可）：

```bash
pnpm install
pnpm dev        # 启动开发服务器，默认 http://localhost:5173
pnpm build      # 类型检查 + 生产构建，产物在 dist/
pnpm preview    # 本地预览生产构建
```

## 数据保存在哪里？如何备份迁移？

藏品数据保存在**当前浏览器**的 localStorage（键名 `cangwuzhi:items:v1`），不随网站代码上传。

- **换浏览器 / 换电脑 / 清缓存前**：进入「管理」页点 **导出 JSON**，得到 `cangwuzhi-YYYY-MM-DD.json`；在新环境点 **导入 JSON** 即可合并恢复。
- **想让数据永久固化进站点**（任何人打开都能看到）：用导出的 JSON 内容替换 `src/data/seed.ts` 中的 `SEED_ITEMS` 数组（保持相同字段结构），重新构建部署即可。
- 首次打开且本地无数据时，会自动载入 16 件内置示例藏品。

## 部署

项目已使用相对路径（`base: './'`）与 Hash 路由，可零配置部署到任意静态托管，子目录下也能正常刷新。

### Vercel（推荐）

1. 把项目推到 GitHub
2. 在 Vercel 中 Import 该仓库
3. Framework Preset 选 **Vite**，构建命令 `pnpm build`（或 `npm run build`），输出目录 `dist`
4. Deploy，完成

### Netlify

构建命令 `pnpm build`，发布目录 `dist`，其余默认即可。

### GitHub Pages（本项目已配置，推送即自动部署）

仓库内置 `.github/workflows/deploy.yml`：每次 push 到 `main`，GitHub Actions 自动安装依赖、构建并发布到 Pages，无需手动操作。首次使用需在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

当前线上地址：<https://lyx0717.github.io/my-collection/>

如需手动构建部署也可以：

```bash
pnpm build
pnpm dlx gh-pages -d dist
```

Hash 路由保证部署在子路径下刷新也不 404。

### Nginx / 自有服务器

把 `dist/` 目录作为静态站点根目录即可，无需任何 rewrite 规则。

## 目录结构

```
src/
├── main.tsx                # 入口：HashRouter + CollectionProvider
├── App.tsx                 # 路由与整体布局
├── index.css               # Tailwind v4 主题 token 与全局质感样式
├── types.ts                # Item / Category 类型
├── data/seed.ts            # 内置示例藏品（可替换为自己的数据）
├── lib/categories.tsx      # 四类元数据：名称、图标、水印字、渐变、点缀色
├── store/CollectionContext.tsx  # localStorage 持久化、增删改、导入导出、重置
├── utils/                  # id / 标签解析 / 搜索与登记号
├── components/             # Header、SearchBar、CategoryBar、TagFilter、
│                           # Cover、ItemCard、ItemModal、EmptyState、Footer
└── pages/                  # HomePage、AdminPage、AdminItemForm
```
