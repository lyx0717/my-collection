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
      <div className="glass-card rounded-[20px] border border-line2/60 p-5">
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
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-[12.5px] font-medium text-ink2 hover:bg-surface-2"
          >
            恢复内置书签
          </button>
          <button
            onClick={onClear}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-[12.5px] font-medium text-ink2 hover:border-danger/40 hover:text-danger"
          >
            清空全部数据
          </button>
        </div>
        <p className="mt-4 text-[11.5px] leading-5 text-ink3">
          本地数据键名 mybookmarks:v4，仅存在于当前浏览器。清除站点数据前，请先导出 JSON；也可用导出文件替换
          src/data/seed.ts 后重新部署，把数据固化进仓库。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-ink3">
          隐私说明：书签库始终只保存在你的浏览器里，不会上传到任何服务器。唯一的外部请求有两类 ——
          ① 添加书签时的「自动补全」会把该条 URL 发送到 api.microlink.io 获取标题、描述与封面（获取失败不影响保存，也可手动填写）；
          ② 展示图标时会直接访问对应站点的 /favicon.ico。
        </p>
      </div>
    </section>
  )
}
