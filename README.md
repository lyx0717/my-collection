# 我的书签 · Bookmarks

个人书签收藏网站：**存得快、找得到、点得开**。精致卡片风的高效率书签库，数据保存在浏览器本地，部署在 GitHub Pages。

- 技术栈：React 18 + Vite + TypeScript + Tailwind CSS v4 + React Router（Hash 模式）
- 在线地址：<https://lyx0717.github.io/my-collection/>

## 功能

**书签库（首页）**

- 左侧分组 + 标签导航；**列表 / 网格 / 磁贴**三视图切换（偏好本地记忆）
- **实心 / 玻璃**外观（设置 → 外观）：玻璃模式下顶栏与侧栏半透明，紧凑卡片悬停磨砂
- 库内筛选：标题、域名、描述、标签、URL 多词「且」匹配；`⌘K / Ctrl+K` 或 `/` 聚焦
- 顶栏互联网搜索引擎：百度 / 必应 / Google / 自定义（`%s` 占位）
- 多标签交集筛选、按分组 / 星标 / 域名筛选；筛选状态写入 URL
- 排序：最新收录 / 最早收录 / 标题 A→Z
- **批量操作**（列表视图）：多选后移动分组、加标签、加星标、删除
- **同域名批量归类**：按域名筛选后一键把该域名书签移入分组
- favicon：展示时按域名解析（站点 `/favicon.ico` → DuckDuckGo → 文字徽章），不依赖抓取额度
- 快捷键：`N` 新建、`Esc` 关闭弹窗/清空搜索

**添加书签**

- 粘贴 / 输入链接后自动通过 Microlink 抓取标题、描述、封面、图标（免费 25 次/天；失败静默降级为手填）
- 相同 URL 自动判重，可选择仍要保存

**书签小工具（bookmarklet）**

设置页有可拖到浏览器书签栏的按钮，在任意网页一键收藏。

**设置页**

- **外观**：实心 / 玻璃
- **数据**：导入浏览器 HTML、iTab `.itabdata`、JSON/CSV；导出 JSON / Netscape HTML
- 分组管理、标签管理；恢复内置数据 / 清空全部

## 数据存在哪？

localStorage 键名 `mybookmarks:v2`，**仅保存在当前浏览器**。

- 换电脑 / 清缓存前：设置页 **导出 JSON**，新环境再 **导入**
- 想把数据固化进仓库：用导出的 JSON 替换 `src/data/seed.ts` 后重新部署（首次无本地数据时会加载 seed）
- 本项目**不提供云同步**，备份请靠导出或 git

## 本地开发

需要 Node.js 18+：

```bash
pnpm install
pnpm dev       # 开发服务器
pnpm build     # 类型检查 + 生产构建到 dist/
pnpm preview   # 预览生产构建
pnpm test      # 纯函数单测
```

## 部署

推送到 `main` 即自动构建发布到 GitHub Pages（`.github/workflows/deploy.yml`）。Hash 路由 + 相对路径，子路径刷新不 404。

## 目录结构

```
src/
├── types.ts
├── data/seed.ts                 # 内置真实书签（可替换；按需懒加载）
├── store/                       # BookmarksContext / AppearanceContext
├── lib/                         # url、netscape、importFile、appearance…
├── hooks/
├── components/
└── pages/                       # HomePage、SettingsPage
```
