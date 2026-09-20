import { Bookmark } from 'lucide-react'
import { bookmarkletHref } from '../../lib/bookmarklet'
import SectionTitle from './SectionTitle'

export default function BookmarkletSection() {
  return (
    <section id="sec-bookmarklet" className="scroll-mt-24">
      <SectionTitle
        title="书签小工具"
        desc="在任何网页点一下书签栏里的按钮，就能带着网址和标题一键收藏，无需安装扩展。"
      />
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
        <div className="flex flex-col items-center gap-3 rounded-[14px] bg-surface-2 px-6 py-7 text-center">
          <p className="text-[13px] text-ink2">把下面这个按钮拖到你的浏览器书签栏：</p>
          <a
            href={bookmarkletHref()}
            onClick={(e) => e.preventDefault()}
            draggable
            className="flex h-11 cursor-grab items-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(62,92,255,.55)] active:cursor-grabbing"
          >
            <Bookmark size={15} fill="white" />
            收藏到我的书签
          </a>
          <p className="text-[11.5px] text-ink3">
            如果书签栏没显示：Chrome/Edge 按 ⌘/Ctrl+Shift+B；Safari 在「显示」菜单里开启
          </p>
        </div>
        <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-[12.5px] leading-6 text-ink2">
          <li>显示浏览器的书签栏；</li>
          <li>
            将上方按钮拖动到书签栏中（拖不动时，可在书签栏手动新建书签，名称随意，地址粘贴帮助文档里的代码）；
          </li>
          <li>以后浏览任何网页，点一下该书签，就会打开本站并自动填好网址与标题。</li>
        </ol>
      </div>
    </section>
  )
}
