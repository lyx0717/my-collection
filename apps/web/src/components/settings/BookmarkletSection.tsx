import { Bookmark } from 'lucide-react'
import { bookmarkletHref } from '../../lib/bookmarklet'
import SectionTitle from './SectionTitle'

export default function BookmarkletSection() {
  const href = bookmarkletHref()

  return (
    <section id="sec-bookmarklet" className="scroll-mt-24">
      <SectionTitle
        title="书签小工具"
        desc="把按钮拖到书签栏，之后在任何网页点一下，就能带着网址和标题直接收藏。"
      />
      <div className="glass-card rounded-[20px] border border-line2/70 p-5">
        <div className="flex flex-col items-center gap-3 rounded-[16px] bg-surface-2 px-6 py-7 text-center">
          <a
            href={href}
            onClick={(e) => e.preventDefault()}
            draggable
            className="flex h-11 cursor-grab items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-semibold text-white shadow-[0_6px_14px_-6px_var(--accent-shadow)] active:cursor-grabbing"
          >
            <Bookmark size={15} fill="white" />
            收藏到狗蛋书签
          </a>
          <p className="text-[11.5px] text-ink3">
            按住拖到书签栏即可；书签栏没显示时按 ⌘/Ctrl+Shift+B
          </p>
        </div>
        {/* 拖拽在小屏和无书签栏的浏览器里会失败，失败路径收在折叠里，不占正文 */}
        <details className="mt-4 text-[12.5px] text-ink2">
          <summary className="cursor-pointer text-ink3">拖不动？手动新建一个书签</summary>
          <p className="mt-2 leading-6">
            在书签栏新建任意书签，名称随意，把地址整行替换成下面这段：
          </p>
          <code className="mt-2 block overflow-x-auto rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-[11.5px] leading-5 text-ink2 select-all">
            {href}
          </code>
        </details>
      </div>
    </section>
  )
}