import { Bookmark } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-800/70 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-center sm:px-6 lg:px-10">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper-muted">
          <Bookmark size={11} className="text-gold/70" />
          藏品数据仅保存在当前浏览器
        </p>
        <p className="font-serif text-xs tracking-widest text-paper-muted/70">
          藏物志 · 收拢散落各处的热爱
        </p>
      </div>
    </footer>
  )
}
