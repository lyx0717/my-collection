# 狗蛋书签

个人书签收藏网站：**存得快、找得到、点得开**。精致卡片风的高效率书签库，数据保存在浏览器本地，部署在 GitHub Pages。

- 技术栈：React 18 + Vite + TypeScript + Tailwind CSS v4 + React Router（Hash 模式）
- 在线地址：<https://lyx0717.github.io/my-collection/>

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
- 库内筛选：标题、域名、描述、标签、URL 多词「且」匹配；`⌘K / Ctrl+K` 或 `/` 聚焦
- 顶部互联网搜索引擎：百度 / 必应 / Google / 自定义（`%s` 占位）
- 按分组 / 域名筛选；筛选状态写入 URL
- 排序：最新收录 / 最早收录 / 标题 A→Z
- **批量操作**（列表视图）：多选后移动分组、加标签、删除
- **同域名批量归类**：按域名筛选后一键把该域名书签移入分组
- 没有分组的书签直接出现在「全部」里，不单列视图
- favicon：展示时按域名解析（历史图标 → 站点 `/favicon.ico` → 名称首字徽章），不依赖抓取额度
- 快捷键：`N` 新建、`Esc` 关闭弹窗/清空搜索
- 无障碍：尊重 `prefers-reduced-motion` 与 `prefers-reduced-transparency`（玻璃降级为实色）

**添加书签**

- 粘贴 / 输入链接后自动通过 Microlink 抓取标题、描述、封面、图标（免费 25 次/天；失败静默降级为手填）
- 相同 URL 自动判重，可选择仍要保存

**书签小工具（bookmarklet）**

设置页有可拖到浏览器书签栏的按钮，在任意网页一键收藏。

**设置页**

- **外观**：浅色 / 深色 / 跟随系统（界面固定为玻璃风格，不可切换）
- **数据**：导入浏览器 HTML、iTab `.itabdata`、JSON/CSV；导出 JSON / Netscape HTML
- **分组管理**：新建 / 编辑 / 删除 / 拖拽排序（首页导航只读，这里是唯一的分组管理入口）
- 标签管理；恢复内置数据 / 清空全部

设置页顶部为通栏固定导航 + 悬浮文字胶囊分段控件，与首页分组导航同一套视觉语言。

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
