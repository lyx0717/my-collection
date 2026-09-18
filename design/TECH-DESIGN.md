# 书签收藏站 · 技术设计文档（v1，待确认）

> 配合 `design/preview.html` 高保真设计稿阅读。本文档只描述**一期（纯本地静态站）**，二期能力单列路线图。
> 现有仓库（「藏物志」）将整体重构：保留工程基座（React 18 + Vite + TS + Tailwind v4 + GitHub Actions 部署），重写业务代码。

## 1. 产品定位

个人**书签库**（bookmark manager），不是稍后读、不是策展杂志。

- 核心动作：**存得快、找得到、点得开**
- 形态：高效率检索为主的书签库（侧栏 + 搜索 + 列表/网格双视图），视觉语言为精致卡片风
- 约束：纯前端静态站、GitHub Pages 部署、数据在浏览器本地、零运行成本

## 2. 信息架构

```
我的书签
├── 全部书签（默认页，列表视图）
├── 星标书签
├── 分组（Collection，扁平一级，可自建/改名/删除/排序）
│   └── 未分组（不属于任何分组的书签）
└── 标签（自动聚合，点击进入标签筛选）

设置页
├── 数据导入导出（HTML / JSON / CSV）
├── 分组管理（增删改名、拖拽排序）
├── 书签小工具（bookmarklet 安装引导）
└── 关于（版本、存储占用、清空/恢复示例）
```

路由（Hash 模式，兼容 Pages 子路径）：

| 路径 | 页面 |
|---|---|
| `#/` | 书签库主页（筛选状态走 query string） |
| `#/starred` | 星标（等价主页 + star=1，实际用 query 表达即可，可不单设） |
| `#/settings` | 设置 |
| `#/add?u=&t=` | 拉起添加弹窗（bookmarklet 入口，站点任意页均可） |

**筛选状态写入 URL**：`#/?c=col_3&tag=前端&tag=工具&q=react&sort=desc&view=list&star=1`
多标签为交集（AND）；刷新/收藏 URL 即保存常用视图。

## 3. 数据模型

存储键：`mybookmarks:v2`（与旧键 `cangwuzhi:items:v1` 隔离，互不影响；旧版数据不再读取，上线时本地无新键则载入新示例数据）。

```ts
type Bookmark = {
  id: string                 // crypto.randomUUID()
  url: string
  title: string
  description?: string       // og:description 或用户备注
  domain: string             // 规范化域名，去 www.，用于图标/筛选/去重
  faviconUrl?: string        // 抓取到的图标；为空走三级兜底
  cover?: string             // og:image
  collectionId?: string      // undefined = 未分组
  tags: string[]
  starred: boolean
  createdAt: string          // ISO
  updatedAt: string
}

type Collection = {
  id: string                 // col_xxx
  name: string
  emoji?: string
  order: number
}

type StoreShape = {
  version: 2
  bookmarks: Bookmark[]
  collections: Collection[]
}
```

设计要点：
- **去重键 = 规范化 URL**（去掉 `#fragment`、末尾 `/`、统一 https、去 `www.`、query 保留）；导入和保存时检测重复，重复时给出「已存在，去看看 / 仍要保存」提示
- 标签不建实体表：从书签聚合，重命名/删除标签通过批量更新书签完成（设置页提供标签管理）
- 分组删除不删书签：被删分组内书签回到「未分组」

## 4. 目录结构与组件

```
src/
├── main.tsx / App.tsx / router
├── index.css                 # Tailwind @theme token（取自设计稿规范板）
├── types.ts
├── data/seed.ts              # ~22 条真实示例书签 + 4 个分组
├── store/
│   ├── BookmarksContext.tsx  # 状态、localStorage 持久化、CRUD、去重、筛选
│   └── filter.ts             # 纯函数：搜索/标签交集/排序/URL query 编解码
├── lib/
│   ├── url.ts                # URL 规范化、域名提取
│   ├── favicon.ts            # favicon 三级 URL 策略 + 颜色哈希
│   ├── metadata.ts           # Microlink 抓取（含超时/额度降级）
│   ├── netscape.ts           # Netscape HTML 解析与导出
│   └── bookmarklet.ts        # 小工具代码生成
├── components/
│   ├── layout/Sidebar.tsx · Topbar.tsx
│   ├── bookmarks/
│   │   ├── BookmarkRow.tsx · BookmarkGridCard.tsx · Favicon.tsx
│   │   ├── TagChip.tsx · ViewToggle.tsx · SortMenu.tsx
│   │   └── BookmarkModal.tsx # 添加/编辑共用（含抓取中状态机）
│   ├── settings/ImportPanel.tsx · ExportPanel.tsx ·
│   │   CollectionManager.tsx · BookmarkletGuide.tsx
│   └── common/EmptyState.tsx · ConfirmDialog.tsx · Toast.tsx
└── pages/HomePage.tsx · SettingsPage.tsx
```

## 5. 关键实现方案

### 5.1 Favicon 三级兜底（纯前端，无 CORS 问题）

`<img>` 标签加载图片不受 CORS 限制，直接用 `onerror` 链：

```
① https://favicon.im/{domain}?larger=true
   → onerror ② https://{domain}/favicon.ico
   → onerror ③ <span>首字母 + 域名哈希颜色块（零请求）
```

- 颜色：`hash(domain)` 映射到预设的 12 组柔和底色/深色文字对（设计稿规范板展示的形式）
- 列表 21px、网格大封面 28px、手机 20px；容器圆角 10px、底 #F4F3EF
- 不主动持久化「哪个源失败」，但可在内存缓存当日失败域名，避免同会话反复请求

### 5.2 粘贴 URL 自动抓元数据（Microlink + 降级）

- 请求：`https://api.microlink.io/?url={encodeURIComponent(url)}`（免 key，浏览器直连，免费 25 次/天/IP）
- 取值：`data.title`、`data.description`、`data.image.url`（og:image）、`data.logo.url`
- 状态机：`idle → fetching(≤6s 超时) → ready | degraded`
  - 成功：预填表单，显示「已自动获取」横幅（设计稿画板 03 状态 B），字段全部可改
  - 失败/超额：静默降级，只保留 URL 与抓取到的 title（bookmarklet 场景自带 title），表单照常可存（状态 A 文案切换为「无法自动获取，请手动填写」）
- 同一规范化 URL 5 分钟内不重复请求
- 国内可达性风险：Microlink 在国内访问不稳定；降级路径保证核心流程永远不被阻断（二期可自建 Cloudflare Worker 代理，见路线图）

### 5.3 浏览器书签导入（Netscape HTML）

四大浏览器导出的标准格式：

```html
<DT><H3>开发资料</H3>
<DL><p>
  <DT><A HREF="https://developer.mozilla.org/" ADD_DATE="1700000000" ICON="...">MDN</A>
  <DD>描述文本
</DL><p>
```

- `new DOMParser().parseFromString(text, 'text/html')` 解析
- 遍历 `h3` + `dl` 的嵌套还原文件夹层级；一期分组是扁平结构：顶层文件夹建为分组，深层文件夹拍平为 `父/子` 标签或归入顶层分组（取顶层）
- `<a>` 的 `href/textContent/add_date` 映射书签；`href` 非 http(s)（javascript:、about:）跳过
- 流程：选文件 → 解析统计（总数/重复数/新分组数）→ **预览表**（画板 05：勾选、分组下拉改归属、重复行置灰）→ 确认导入
- 兼容：Raindrop CSV（papaparse）、Linkding/本站 JSON
- 导入后异步补 favicon（渲染时自然触发，无需额外任务）

### 5.4 导出

- **本站 JSON**：`{version, bookmarks, collections}`，下载 `mybookmarks-YYYY-MM-DD.json`
- **Netscape HTML**：按分组生成 `<H3><DL>` 结构，可直接导回任意浏览器（实现 5.3 的逆过程，用 `<a>` 转义拼接，不依赖序列化库）

### 5.5 书签小工具（bookmarklet）

设置页提供可拖拽到书签栏的链接，代码：

```js
javascript:(()=>{open('https://lyx0717.github.io/my-collection/#/add?u='
  +encodeURIComponent(location.href)+'&t='+encodeURIComponent(document.title),'_blank')})()
```

- 站点启动时检查 `location.hash` 中的 `u/t`：自动打开添加弹窗并预填 URL/标题，随即对该 URL 走一次元数据抓取（补描述/封面）
- 优点：零审核、跨浏览器、能拿到真实页面标题；缺点：CSP 极严的站点可能拦（此时可手动复制链接，二期再补 MV3 扩展）

### 5.6 搜索与筛选

- 即时匹配字段：`title + domain + description + tags + url`，空格分词为 AND
- 多标签 AND；分组单选；星标开关；域名可点击（行副标题）做筛选
- 排序：最新收录 / 最早收录 / 标题 A→Z；视图：列表 / 网格（偏好存 localStorage）
- 列表使用普通 DOM 渲染（个人量级 < 数千条无需虚拟化；若超过 2000 条再上窗口化）

### 5.7 键盘快捷键

| 键 | 动作 |
|---|---|
| `/` 或 `⌘K / Ctrl+K` | 聚焦搜索 |
| `Esc` | 清空搜索 / 关弹窗 |
| `N` | 新建书签 |
| `S`（选中行时） | 星标；`E` 编辑；`Enter` 打开原链接 |

输入框聚焦时不触发字母快捷键。

## 6. 视觉与交互规范（固化自画板 00）

- Token：页面底 `#F7F6F3`、卡片 `#FFFFFF`、主文字 `#1C1B19`、次 `#57544E`、弱 `#928E86`、描边 `#ECEAE4`、强调 `#3E5CFF`、强调浅底 `#EEF0FF`、星标 `#F5A524`、危险 `#E5484D`
- 圆角：卡片 14、弹窗 18、输入 10–12、favicon 容器 10；阴影两级（`0 1px 2px` / hover 浮起）
- 字体：系统无衬线栈，不引外部字体（国内零加载成本）
- 动效 150–200ms，`prefers-reduced-motion` 全关
- 响应式断点：≥1100 侧栏常驻；<1100 侧栏抽屉；手机（<640）chips + 单列 + 底部两 tab
- 可访问性：语义化 button/a、aria-label 图标按钮、focus 蓝光环、弹窗焦点陷阱 + Esc、对比度 ≥ AA
- 二期深色模式：颜色全部经 CSS 变量定义（Tailwind `@theme` + 运行时 `data-theme`），一期先出浅色但不留技术债

## 7. 状态管理与持久化

- React Context + `useReducer`（与现有 CollectionContext 同思路）：一个 StoreShape，动作 `add/update/remove/toggleStar/import/reset/collections.*`
- 每次变更写 localStorage（`JSON.stringify`）；首次挂载读取，解析失败回退示例数据
- 所有写操作经过 URL 规范化与去重检查
- localStorage 容量约 5MB：纯文本书签可存数万条；导入超大文件前做容量预估与提示

## 8. 构建与部署

- 沿用现有：Vite 6 + React 18 + TS strict + Tailwind v4（`@tailwindcss/vite`）；`pnpm build` 必须零 TS 错误
- 沿用 `.github/workflows/deploy.yml`：push main → Actions 构建 → GitHub Pages
- 相对路径 `base:'./'` + Hash 路由，地址不变：<https://lyx0717.github.io/my-collection/>
- 上线前数据迁移：新版本首次加载发现无 `v2` 键时载入新示例；不提供 v1 自动迁移（两版模型完全不同；旧示例数据无保留价值，README 说明）

## 9. 验收清单（开发完成后逐项浏览器实测）

1. 桌面：列表/网格切换、侧栏分组/标签计数、hover 操作、星标、空态分组
2. 搜索：多词 AND、标签交集、query string 刷新保持、⌘K / N / Esc
3. 添加：粘贴 URL 抓取（成功/失败两态）、bookmarklet `#/add` 预填、重复 URL 提示、表单校验
4. 编辑/删除：删除确认、分组删除后书签回到未分组
5. 设置：Netscape HTML 导入预览与去重、JSON 往返导出再导入一致、导出 HTML 可被浏览器接受
6. favicon：正常站点显示真图标，不可达时降级字母块
7. 移动端 390px：chips、单列、添加表单、底部 tab，无横向溢出
8. 生产构建 `pnpm build` 通过；preview 环境全功能冒烟；推送后线上地址验证

## 10. 二期路线（一期明确不做）

| 能力 | 方案 | 触发条件 |
|---|---|---|
| 跨设备同步 | Cloudflare Worker + KV（Worker 内校验密码，绑自有域名保国内可达），静态站直连 | 需要多端实时一致 |
| 浏览器扩展 | MV3：popup 取当前 tab → POST Worker / 或打开 `#/add`（无后端也可做） | bookmarklet 受 CSP 限制不够用 |
| 元数据代理 | 同一个 Cloudflare Worker 用 HTMLRewriter 解析 OG，替代 Microlink 免费额度 | 25 次/天不够或国内不可用 |
| 死链/重复体检 | 本地脚本或 Worker 批量 HEAD，设置页出报告 | 收藏量上规模 |
| 全文搜索 | Pagefind（静态索引思路）或后端 | 书签上千条、需要搜正文 |
| 深色模式 | CSS 变量已预留，加切换器即可 | — |
| 网页快照 | Internet Archive 提交链接（零成本）或单文件 HTML | 怕链接腐烂 |

## 11. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| Microlink 免费额度/国内网络 | 自动抓取失败 | 静默降级手填，流程不中断；二期 Worker |
| favicon.im 不稳定 | 图标缺失 | 三级 onerror 兜底，字母块为最终形态，零白图 |
| GitHub Pages 国内访问速度 | 加载慢 | 无外部字体/无大依赖；gzip 后 JS 预期 < 90KB |
| localStorage 误清 | 数据丢失 | 设置页显著提示 + 一键 JSON 导出；二期同步 |
| 大文件导入超限 | 写入失败 | 导入前估算容量，超额提示分批 |
