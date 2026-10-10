import { Bookmark, Library } from 'lucide-react'
import CapsuleNav, { type CapsuleNavItem } from './CapsuleNav'
import { iconForCollection } from '../lib/collectionIcons'
import type { Collection, Scope } from '../types'

interface GroupNavProps {
  total: number
  collections: Collection[]
  collectionCounts: Map<string, number>
  scope: Scope
  onScope: (scope: Scope) => void
}

function scopeIsActive(scope: Scope, target: Scope['type'], id?: string): boolean {
  if (scope.type !== target) return false
  return id === undefined || (scope.type === 'collection' && scope.id === id)
}

/**
 * 分组导航：与设置页导航共用 CapsuleNav 组件，
 * 所以宽度自适应、居中方式、玻璃材质、图标排布、选中态都是同一套代码。
 *
 * 只做「点击切换作用域」—— 分组的增删改与排序全部收敛到设置页。
 * 导航区一旦挂上可编辑控件，误触成本远高于收益，
 * 而分组管理本来就是低频操作。
 *
 * 图标用 lucide SVG 而非 emoji：emoji 是彩色位图，与单色线性图标混排时
 * 笔画粗细、视觉重量全不一致，且跨平台渲染差异大。详见 lib/collectionIcons.ts。
 */
export default function GroupNav({
  total,
  collections,
  collectionCounts,
  scope,
  onScope,
}: GroupNavProps) {
  const items: CapsuleNavItem[] = [
    {
      key: '__all__',
      label: '全部',
      count: total,
      icon: <Bookmark size={16} strokeWidth={1.8} />,
      active: scopeIsActive(scope, 'all'),
      onClick: () => onScope({ type: 'all' }),
    },
    ...collections.map((col) => {
      const Icon = iconForCollection(col)
      return {
        key: col.id,
        label: col.name,
        count: collectionCounts.get(col.id) ?? 0,
        icon: <Icon size={16} strokeWidth={1.8} />,
        active: scopeIsActive(scope, 'collection', col.id),
        onClick: () => onScope({ type: 'collection', id: col.id }),
      }
    }),
  ]

  // 没有分组时给个引导入口，而不是留一条空胶囊
  if (collections.length === 0) {
    items.push({
      key: '__empty__',
      label: '去设置里创建分组',
      icon: <Library size={16} strokeWidth={1.8} />,
      active: false,
      onClick: () => {
        window.location.hash = '#/settings'
      },
    })
  }

  return <CapsuleNav ariaLabel="分组导航" items={items} maxWidth="min(760px, calc(100vw - 32px))" />
}
