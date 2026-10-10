import type { Bookmark, Collection, StoreShape } from '../types'

/** 当前数据结构版本 */
export const CURRENT_VERSION = 4

/**
 * v3 → v4 迁移：分组从 7 个收敛到 6 个。
 *
 * 背景：v3 的「生活」和「影音」在国内站点视角下是同一件事 —— 微博、小红书、爱奇艺、
 * 抖音、B 站都是国内服务，两个分组切开后每边都半空；而「网络」组里的机场梯子与
 * YouTube / X 这类境外站点才是同一类可访问性需求。故：
 * - 「影音」解散，其条目按站点归属并入「生活」（境外站点除外）；
 * - 生活 / 影音里的境外站点统一抽到原「网络」组；
 * - 原「网络」组 id 改为 col_sci、名称改为「科学」。
 *
 * 与 v2→v3 一致，判定基于**域名**而非标题，条数守恒是硬约束。
 */

/** v4 分组定义（顺序即侧栏顺序） */
export const V4_COLLECTIONS: Collection[] = [
  { id: 'col_dev', name: '开发', emoji: '💻', order: 0 },
  { id: 'col_ai', name: 'AI', emoji: '🤖', order: 1 },
  { id: 'col_work', name: '工作', emoji: '💼', order: 2 },
  { id: 'col_life', name: '生活', emoji: '🏠', order: 3 },
  { id: 'col_tool', name: '工具', emoji: '🧰', order: 4 },
  { id: 'col_sci', name: '科学', emoji: '🔬', order: 5 },
]

/** v3 分组 id → v4 分组 id。col_media 先按域名再决定去向，故不在这张表里。 */
const V3_COLLECTION_ID_MAP: Record<string, string> = {
  col_dev: 'col_dev',
  col_ai: 'col_ai',
  col_work: 'col_work',
  col_life: 'col_life',
  col_tool: 'col_tool',
  col_net: 'col_sci',
}

/**
 * 国内站点的强特征：内网域名、.cn 系后缀。命中即判定为国内，无需逐个列举。
 */
const DOMESTIC_SUFFIXES = ['.cn', '.com.cn', '.gov.cn', '.hngtrust.com', '.northking.net']

/**
 * 已知境外站点（域名或其子域）。生活 / 影音里的境外站点据此抽去「科学」。
 *
 * 刻意采用**境外白名单**而非「国内白名单」：默认按国内处理。
 * 代价是日后新增的境外站点会暂留「生活」，拖一下即可；
 * 反向默认则会把新加的国内站（jd.com / taobao.com 这类无 .cn 后缀的）
 * 静默划进「科学」，那才是看不出问题的一类错误。
 */
const FOREIGN_DOMAINS = [
  // 生活组
  'instagram.com', 'x.com', 'twitter.com', 'facebook.com',
  // 影音组
  'youtube.com', 'youtu.be', 'twitch.tv', 'netflix.com', 'vimeo.com',
  'twitsave.com', 'y2mate.com', 'libvio.cam',
]

/** 纯IP 直连（内网系统、Jenkins、堡垒机）一律视为国内 */
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

/**
 * 规范化域名：去协议与路径，逐级剥掉 `www.` / `www-` 前缀。
 *
 * 逐级处理而非只剥开头一次：YouTube 下载站的真实域名是 `v21.www-y2mate.com`，
 * `www-` 用连字符而非点号（`v21.` 这一层就不匹配），只按 `.` 切子域会漏判。
 */
function normalizeDomain(domain?: string): string {
  const labels = (domain ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split('/')[0]
    .split('.')
  // 逐层剥离 www 前缀：`v21.www-y2mate.com` 首层是 v21，剥不动，
  // 必须在前缀层被移除后继续向内层剥离，`www-` 才能露出来
  for (let i = 0; i < labels.length - 1; i++) {
    const head = labels[i]
    if (head.startsWith('www-')) labels[i] = head.slice(4)
    else if (head.startsWith('www') && head.length > 3) labels[i] = head.slice(3)
  }
  return labels.join('.')
}

/** 站点是否位于境外。用于把生活 / 影音里的境外站点抽去「科学」组。 */
export function isForeignSite(domain?: string): boolean {
  const d = normalizeDomain(domain)
  if (!d) return false
  if (IPV4.test(d)) return false
  if (DOMESTIC_SUFFIXES.some((s) => d.endsWith(s))) return false
  return FOREIGN_DOMAINS.some((f) => d === f || d.endsWith(`.${f}`))
}

/**
 * 标签 → 分组关键词。规则按数组顺序匹配、命中即止，所以**顺序本身携带优先级**：
 * - 「机场」必须排在「工具」之前，否则「三毛机场导航」会被通用的「导航」抢走；
 * - 「视频」必须排在「下载工具」之前，否则 X / YouTube 视频下载会误入工具类。
 */
const TAG_RULES: Array<{ group: string; tags: string[] }> = [
  {
    group: 'col_ai',
    tags: ['大模型', '智能体', 'Agent', 'AI绘画', 'AI编程', 'AI邮箱', 'API', '模型社区', '视频生成'],
  },
  {
    group: 'col_work',
    tags: ['工作后台', 'Jenkins', 'VPN', 'Wiki', '报工', '堡垒机', '邮箱', 'Figma', 'UI', '设计协作'],
  },
  {
    group: 'col_dev',
    tags: [
      '前端', '后端', '移动端', '跨端', '算法', '代码托管', '文档', '组件库', '开发工具',
      '构建工具', '微前端', 'Mock', '可视化', '图表', '图标', 'Git', 'JavaScript',
      'TypeScript', 'Vue', 'React', 'Node', '社区', '公众号', '小程序', '开放平台',
      '效率工具', '云服务', '对象存储', '教程', '3D打印',
    ],
  },
  // 机场是强特征词，须早于工具类里的「导航 / 工具」等泛词
  { group: 'col_sci', tags: ['机场', '梯子'] },
  // 影音已并入生活；境外站点（如 YouTube）会在下方统一改判到「科学」
  { group: 'col_life', tags: ['视频', '短视频', '影视', '音乐', 'B站', 'NBA', '体育', '图片', '电商', '社交', '种草', '地图', '资讯', '阅读', '苹果', '小米', '汽车', '出行', '购票', '金融', '股票', '招聘', '问答'] },
  { group: 'col_tool', tags: ['工具', '云盘', '政务', '二维码', '起始页', 'Mac软件', '软件资源', '浏览器插件', '下载工具', '效率', '账号', '导航'] },
]

/**
 * 由标签语义推断目标分组；无法判定时返回 undefined（落入「未分组」）。
 * 传入 domain 时，生活 / 影音语义的境外站点会被改判到「科学」。
 */
export function groupForTags(tags: string[], domain?: string): string | undefined {
  for (const rule of TAG_RULES) {
    if (tags.some((t) => rule.tags.includes(t))) {
      // 规则命中「生活」但站点在境外 → 归「科学」
      if (rule.group === 'col_life' && isForeignSite(domain)) return 'col_sci'
      return rule.group
    }
  }
  return undefined
}

/** v2 旧档书签：后续版本的 Bookmark 不再带 tags */
export type LegacyBookmark = Bookmark & { tags: string[] }

/**
 * v3 → v4。解散「影音」，境外站点抽入「科学」，其余原样保留。
 * 用户自建的分组不在 id 映射表内，保持不变 —— 条数与分组归属都不丢。
 */
export function migrateV3ToV4(data: {
  version: number
  bookmarks: Bookmark[]
  collections: Collection[]
}): StoreShape {
  const bookmarks = data.bookmarks.map((bm) => {
    const from = bm.collectionId
    let collectionId = from
    if (from === 'col_net') {
      collectionId = 'col_sci'
    } else if (from === 'col_media') {
      collectionId = isForeignSite(bm.domain) ? 'col_sci' : 'col_life'
    } else if (from === 'col_life' && isForeignSite(bm.domain)) {
      collectionId = 'col_sci'
    } else if (from && V3_COLLECTION_ID_MAP[from]) {
      collectionId = V3_COLLECTION_ID_MAP[from]
    }
    return collectionId === from ? bm : { ...bm, collectionId }
  })

  // 保留用户自建分组，追加在新分组之后。
  // 判据必须是「v3 的内置 id 全集」而非 v4：col_media / col_net 已解散，
  // 它们不在 v4 里，若拿 v4 当白名单就会被当成自建分组错误地留下来。
  const v3Builtin = new Set([...Object.keys(V3_COLLECTION_ID_MAP), 'col_media'])
  const custom = data.collections.filter((c) => !v3Builtin.has(c.id))
  const collections = [
    ...V4_COLLECTIONS,
    ...custom.map((c, i) => ({ ...c, order: V4_COLLECTIONS.length + i })),
  ]

  return { version: CURRENT_VERSION, collections, bookmarks }
}

/**
 * v2 数据直迁 v4（保留 tags 参与判定）。书签条数永不减少：
 * 规则未命中时按 id 映射回退，仍无法确定才落入未分组。
 */
export function migrateV2ToV4(data: {
  version: number
  bookmarks: LegacyBookmark[]
  collections: Collection[]
}): StoreShape {
  const knownIds = new Set(V4_COLLECTIONS.map((c) => c.id))

  const bookmarks: Bookmark[] = data.bookmarks.map((bm) => {
    const { tags, ...rest } = bm
    // 归组优先级：标签规则命中 > v3 分组 id 映射 > 新旧同 id > 未分组。
    // 绝不保留已解散分组的 id —— 否则侧栏会指向一个不存在的分组
    const mapped = bm.collectionId ? V3_COLLECTION_ID_MAP[bm.collectionId] : undefined
    const fallback =
      mapped ?? (bm.collectionId && knownIds.has(bm.collectionId) ? bm.collectionId : undefined)
    return { ...rest, collectionId: groupForTags(tags, bm.domain) ?? fallback }
  })

  return { version: CURRENT_VERSION, collections: V4_COLLECTIONS, bookmarks }
}