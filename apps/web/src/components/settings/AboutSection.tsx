import { useBookmarks } from '../../store/BookmarksContext'
import { useAuth } from '../../store/AuthContext'
import SectionTitle from './SectionTitle'

interface Props {
  onClear: () => void
}

export default function AboutSection({ onClear }: Props) {
  const { bookmarks, collections } = useBookmarks()
  const { user } = useAuth()

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
          <div className="min-w-0">
            <dt className="text-ink3">登录账号</dt>
            <dd className="mt-1 truncate text-[13px] font-semibold text-ink" title={user?.email}>
              {user?.email ?? '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2.5 border-t border-line pt-5">
          <button
            onClick={onClear}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-[12.5px] font-medium text-ink2 hover:border-danger/40 hover:text-danger"
          >
            清空全部数据
          </button>
        </div>

        <p className="mt-4 text-[11.5px] leading-5 text-ink3">
          书签保存在你自己的服务器上、按账号隔离，换设备登录同一账号即可看到全部数据。
          想本地留一份备份，用上方的「导出 JSON」即可。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-ink3">
          外部请求有两类 —— ① 添加书签时的「自动补全」会把该条 URL 发送到 api.microlink.io
          获取标题、描述与封面（失败不影响保存，也可手动填写）；② 展示图标时会直接访问对应站点的
          /favicon.ico。
        </p>
      </div>
    </section>
  )
}
