import { useState } from 'react'
import { FolderInput, Globe } from 'lucide-react'
import type { Collection } from '../types'

interface DomainBatchBarProps {
  domain: string
  count: number
  collections: Collection[]
  onMove: (collectionId: string | undefined) => void
}

/** 按域名筛选后出现的横幅：一键把该域名所有书签移动到某分组 */
export default function DomainBatchBar({ domain, count, collections, onMove }: DomainBatchBarProps) {
  const [value, setValue] = useState('')

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
      <Globe size={14} className="shrink-0 text-accent" />
      <span className="text-[12.5px] text-ink2">
        当前显示 <b>{count}</b> 个来自 <b>{domain}</b> 的书签，可统一归类：
      </span>
      <div className="relative ml-auto flex items-center">
        <FolderInput size={13} className="pointer-events-none absolute left-2 text-ink3" />
        <select
          value={value}
          onChange={(e) => {
            if (!e.target.value) return
            if (e.target.value === '__none__') onMove(undefined)
            else onMove(e.target.value)
            setValue('')
            e.target.value = ''
          }}
          className="h-8 appearance-none rounded-lg border border-line bg-white pl-7 pr-7 text-[12px] font-medium text-ink2 outline-none focus:border-accent"
        >
          <option value="">移动到分组…</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji ? `${c.emoji} ` : ''}
              {c.name}
            </option>
          ))}
          <option value="__none__">未分组</option>
        </select>
      </div>
    </div>
  )
}
