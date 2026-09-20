import { useBookmarks } from '../../store/BookmarksContext'
import SectionTitle from './SectionTitle'

interface Props {
  onReset: () => void
  onClear: () => void
}

export default function AboutSection({ onReset, onClear }: Props) {
  const { bookmarks, collections, storageBytes } = useBookmarks()
  const kb = (storageBytes / 1024).toFixed(1)

  return (
    <section id="sec-about" className="scroll-mt-24">
      <SectionTitle title="关于" />
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,.05)]">
        <dl className="grid grid-cols-2 gap-4 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-ink3">书签总数</dt>
            <dd className="mt-1 text-[18px] font-bold tabular-nums">{bookmarks.length}</dd>
          </div>
          <div>
            <dt className="text-ink3">分组数量</dt>
            <dd className="mt-1 text-[18px] font-bold tabular-nums">{collections.length}</dd>
          </div>
          <div>
            <dt className="text-ink3">本地占用</dt>
            <dd className="mt-1 text-[18px] font-bold tabular-nums">{kb} KB</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2.5 border-t border-line pt-5">
          <button
            onClick={onReset}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 text-[12.5px] font-medium text-ink2 hover:bg-surface-2"
          >
            恢复内置书签
          </button>
          <button
            onClick={onClear}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 text-[12.5px] font-medium text-ink2 hover:border-danger/40 hover:text-danger"
          >
            清空全部数据
          </button>
        </div>
        <p className="mt-4 text-[11.5px] leading-5 text-ink3">
          本地数据键名 mybookmarks:v2，仅存在于当前浏览器。清除站点数据前，请先导出 JSON；也可用导出文件替换
          src/data/seed.ts 后重新部署，把数据固化进仓库。
        </p>
      </div>
    </section>
  )
}
