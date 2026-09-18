# 我的书签 · Bookmarks

个人书签收藏网站：**存得快、找得到、点得开**。精致卡片风的高效率书签库，纯前端、无后端，数据保存在浏览器本地，部署在 GitHub Pages。

- 技术栈：React 18 + Vite + TypeScript + Tailwind CSS v4 + React Router（Hash 模式）
- 在线地址：<https://lyx0717.github.io/my-collection/>

## 功能

**书签库（首页）**

- 左侧分组 + 标签导航；列表 / 网格双视图一键切换（偏好本地记忆）
- 全局搜索：标题、域名、描述、标签、URL 多词「且」匹配；`⌘K / Ctrl+K` 或 `/` 聚焦
- 多标签交集筛选、按分组 / 星标 / 域名筛选；筛选状态写入 URL，可收藏常用视图
- 排序：最新收录 / 最早收录 / 标题 A→Z
- 每条书签自动显示网站 favicon：favicon.im → 站点 /favicon.ico → 域名首字母色块，三级兜底
- 快捷键：`N` 新建、`Esc` 关闭弹窗/清空搜索

**添加书签**

- 粘贴链接自动通过 Microlink 抓取标题、描述、封面、图标（免费 25 次/天；失败静默降级为手填，不阻塞保存）
- 相同 URL 自动判重，可选择仍要保存
- 编辑弹窗内可直接删除（两步确认）

**书签小工具（bookmarklet）**

设置页有一个可拖到浏览器书签栏的按钮。在任意网页点一下，自动带着网址和标题打开本站添加弹窗，无需安装扩展。

**设置页**

- 导入 Chrome / Safari / Edge / Firefox 导出的书签 HTML（文件夹自动映射为分组，按 URL 去重，导入前可逐条预览、改归属）；也支持 Raindrop / Linkding / 本站的 JSON、CSV
- 导出 JSON 完整备份；导出 Netscape HTML 可导回任意浏览器
- 分组管理（增删改名、emoji；删除分组不删书签，回到「未分组」）
- 恢复示例数据 / 清空全部

## 数据存在哪？

localStorage 键名 `mybookmarks:v2`，仅保存在当前浏览器。

- 换浏览器 / 换电脑 / 清缓存前：设置页 **导出 JSON**，到新环境 **导入**
- 想让数据随站点固化：用导出的 JSON 替换 `src/data/seed.ts` 后重新部署

## 本地开发

需要 Node.js 18+：

```bash
pnpm install
pnpm dev       # 开发服务器
pnpm build     # 类型检查 + 生产构建到 dist/
pnpm preview   # 预览生产构建
```

## 部署（已配置 GitHub Actions）

推送到 `main` 即自动构建发布到 GitHub Pages，工作流见 `.github/workflows/deploy.yml`。
仓库 Settings → Pages → Source 需选择 **GitHub Actions**（已配置）。

Hash 路由 + 相对路径，子路径部署刷新不 404，Vercel / Netlify / Nginx 也可直接托管 `dist/`。

## 目录结构

```
src/
├── types.ts
├── data/seed.ts                 # 22 条示例书签 + 4 个分组（可替换）
├── store/BookmarksContext.tsx   # localStorage 持久化、CRUD、去重、分组、导入导出
├── lib/
│   ├── url.ts        # URL 规范化 / 域名提取 / 去重键
│   ├── color.ts      # 域名哈希配色（favicon 兜底 + 网格渐变）
│   ├── metadata.ts   # Microlink 元数据抓取
│   ├── netscape.ts   # 浏览器书签 HTML 解析与导出
│   ├── importFile.ts # HTML/JSON/CSV 导入统一入口
│   ├── bookmarklet.ts
│   └── tags.ts / date.ts / id.ts
├── components/       # Sidebar、Topbar、Favicon、BookmarkRow/GridCard、BookmarkModal…
└── pages/            # HomePage、SettingsPage
```

## 二期方向

Cloudflare Worker + KV 跨设备同步、MV3 浏览器扩展、自建 OG 代理（摆脱 Microlink 额度）、深色模式、死链体检、全文搜索。详见 `design/TECH-DESIGN.md`。
