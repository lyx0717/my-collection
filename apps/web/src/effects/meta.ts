/**
 * 「设计特效」目录。
 *
 * 每个特效只有一个 id、一段卡片文案和一个详情页入口；真正跑在页面里的
 * 组件/场景不放进这里，避免元数据文件和渲染实现互相拖着变大。
 */
export interface EffectMeta {
  id: string
  index: string
  zh: string
  en: string
  desc: string
  tags: string[]
  status: 'ready' | 'wip'
  /** 详情页右侧的「它在哪」链接 */
  where?: { label: string; to: string }
}

export const EFFECTS: EffectMeta[] = [
  {
    id: 'glass-toggle',
    index: '001',
    zh: '光影开关',
    en: 'Glass Theme Toggle',
    desc: '一块会折射的液态玻璃，把白天和黑夜拨到两边。',
    tags: ['交互', 'WebGL2', '材质'],
    status: 'ready',
    where: { label: '设置 → 外观', to: '/settings' },
  },
  {
    id: 'dock',
    index: '002',
    zh: '桌面 Dock',
    en: 'Desktop Dock',
    desc: '五枚图标在毛玻璃里苏醒，光标扫过就一起长高。',
    tags: ['动画', 'Canvas', '10s 循环'],
    status: 'ready',
  },
  {
    id: 'book-card',
    index: '003',
    zh: '书页卡片',
    en: 'Book Card',
    desc: '一张普通产品卡，悬停时沿着书脊翻开，露出里面的四页纸。',
    tags: ['交互', 'CSS 3D', '纸张'],
    status: 'ready',
  },
]

export function getEffect(id: string | undefined): EffectMeta | undefined {
  return EFFECTS.find((e) => e.id === id)
}