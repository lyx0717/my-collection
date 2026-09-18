import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useBookmarks } from '../store/BookmarksContext'

/** 首次连接云端时显示加载，避免闪现本地数据 */
export default function AppGate({ children }: { children: ReactNode }) {
  const { status } = useBookmarks()
  if (status === 'loading') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas text-ink3">
        <Loader2 size={26} className="animate-spin text-accent" />
        <p className="text-[13px]">正在从云端加载书签…</p>
      </div>
    )
  }
  return <>{children}</>
}
