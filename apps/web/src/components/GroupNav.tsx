import { Bookmark } from 'lucide-react'
import CapsuleNav, { type CapsuleNavItem } from './CapsuleNav'
import { iconForCollection } from '../lib/collectionIcons'
import type { Collection, Scope } from '../types'

interface GroupNavProps {
  collections: Collection[]
  scope: Scope
  onScope: (scope: Scope) => void
}

function scopeIsActive(scope: Scope, target: Scope['type'], id?: string): boolean {
  if (scope.type !== target) return false
  return id === undefined || (scope.type === 'collection' && scope.id === id)
}

/**
 * 分组导航：组装 CapsuleNav 的 items，
 * 宽度自适应、居中方式、玻璃材质、图标排布、选中态都复用同一套代码。
 *
 * 只做「点击切换作用域」—— 分组的增删改与排序全部收敛到设置页。
 * 导航区一旦挂上可编辑控件，误触成本远高于收益，
 * 而分组管理本来就是低频操作。
 *
 * 图标用 lucide SVG 而非 emoji：emoji 是彩色位图，与单色线性图标混排时
 * 笔画粗细、视觉重量全不一致，且跨平台渲染差异大。详见 lib/collectionIcons.ts。
 */
export default function GroupNav({ collections, scope, onScope }: GroupNavProps) {
  // 没有分组时整条胶囊不渲染：只剩一个「全部」的导航没有任何可选目标，
  // 而把「去设置里创建分组」塞进胶囊会让它看起来像按钮组，误触成本高于收益。
  // 这条空白由调用方（HomePage 的 sticky 外层）决定如何收掉。
  if (collections.length === 0) return null

  const items: CapsuleNavItem[] = [
    {
      key: '__all__',
      label: '全部',
      icon: <Bookmark size={16} strokeWidth={1.8} />,
      active: scopeIsActive(scope, 'all'),
      onClick: () => onScope({ type: 'all' }),
    },
    ...collections.map((col) => {
      const Icon = iconForCollection(col)
      return {
        key: col.id,
        label: col.name,
        icon: <Icon size={16} strokeWidth={1.8} />,
        active: scopeIsActive(scope, 'collection', col.id),
        onClick: () => onScope({ type: 'collection', id: col.id }),
      }
    }),
  ]

  return <CapsuleNav ariaLabel="分组导航" items={items} maxWidth="min(760px, calc(100vw - 32px))" />
}
