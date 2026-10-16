import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2, LogOut } from 'lucide-react'
import { ApiError } from '../../lib/api'
import { useBookmarks } from '../../store/BookmarksContext'
import { useAuth } from '../../store/AuthContext'
import { useToast } from '../Toast'
import SectionTitle from './SectionTitle'

interface Props {
  onClear: () => void
}

export default function AboutSection({ onClear }: Props) {
  const { bookmarks, collections } = useBookmarks()
  const { user, changePassword, logout } = useAuth()
  const toast = useToast()
  const [pwOpen, setPwOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  // 服务端改密会清掉该用户全部会话，成功后本地已同步登出，守卫会跳回登录页
  const submitPassword = async (event: FormEvent) => {
    event.preventDefault()
    setPwError('')
    if (next.length < 6) {
      setPwError('新密码至少 6 位')
      return
    }
    setPwBusy(true)
    try {
      await changePassword(current, next)
      toast('密码已修改，请用新密码重新登录')
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : '网络异常，请稍后重试')
    } finally {
      setPwBusy(false)
    }
  }

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
            type="button"
            onClick={() => {
              setPwOpen((v) => !v)
              setPwError('')
            }}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-[12.5px] font-medium text-ink2 hover:border-line2 hover:text-ink"
          >
            <KeyRound size={13} />
            {pwOpen ? '收起' : '修改密码'}
          </button>
          <button
            onClick={onClear}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-[12.5px] font-medium text-ink2 hover:border-danger/40 hover:text-danger"
          >
            清空全部数据
          </button>
          {/* 退出登录放在这里而不是只留在首页 DockBar：账号相关操作应聚在同一处，
              从设置页直接退出不必再退回首页 */}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-[12.5px] font-medium text-ink2 hover:border-line2 hover:text-ink"
          >
            <LogOut size={13} />
            退出登录
          </button>
        </div>

        {pwOpen && (
          <form onSubmit={submitPassword} className="mt-4 flex flex-col gap-3 rounded-[14px] border border-line bg-surface-2/50 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-ink3">当前密码</span>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
                className="glass-field h-10 rounded-[10px] border px-3 text-[13.5px]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-ink3">新密码</span>
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className="glass-field h-10 rounded-[10px] border px-3 text-[13.5px]"
                placeholder="至少 6 位"
              />
            </label>
            {pwError && <p className="text-[12.5px] text-danger">{pwError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pwBusy}
                className="flex h-9 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-60"
              >
                {pwBusy && <Loader2 size={13} className="animate-spin" />}
                确认修改
              </button>
              <span className="text-[11.5px] leading-5 text-ink3">
                修改后所有设备都会退出，需要用新密码重新登录。
              </span>
            </div>
          </form>
        )}

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
