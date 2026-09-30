import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useProfile } from '../../store/ProfileContext'
import { useToast } from '../Toast'
import { DEFAULT_PROFILE, profileInitial, type ProfileLink } from '../../lib/profile'
import { letterColor } from '../../lib/color'
import SectionTitle from './SectionTitle'

const inputCls =
  'h-10 w-full rounded-[10px] border border-line bg-white px-3 text-[13.5px] outline-none transition-shadow placeholder:text-[#a8adb7] focus:border-accent focus:shadow-[0_0_0_3px_rgba(66,99,235,.12)]'

export default function ProfileSection() {
  const { profile, updateProfile } = useProfile()
  const toast = useToast()
  const [name, setName] = useState(profile.name)
  const [tagline, setTagline] = useState(profile.tagline)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [links, setLinks] = useState(profile.links)
  const initial = profileInitial(name)
  const color = letterColor(name || '?')

  const apply = () => {
    updateProfile({
      name: name.trim() || '我的书签',
      tagline: tagline.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
      links: links.filter((l) => l.label.trim() && l.url.trim()),
    })
    toast('个人名片已保存')
  }

  const setLinkAt = (i: number, patch: Partial<ProfileLink>) => {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  return (
    <section id="sec-profile" className="scroll-mt-24">
      <SectionTitle title="个人名片" desc="显示在书签首页顶部，偏好保存在本浏览器。" />
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(30,40,60,.05)]">
        <div className="flex flex-wrap items-start gap-5">
          <div className="space-y-1.5">
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-line"
              style={{ background: avatarUrl ? '#fff' : color.bg }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[22px] font-bold" style={{ color: color.fg }}>
                  {initial}
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink3">无图时显示名称首字</p>
          </div>

          <div className="min-w-[220px] flex-1 space-y-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink2" htmlFor="pf-name">
                昵称
              </label>
              <input
                id="pf-name"
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="怎么称呼你"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink2" htmlFor="pf-tag">
                一句话
              </label>
              <input
                id="pf-tag"
                className={inputCls}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="简介 / 签名"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink2" htmlFor="pf-avatar">
                头像链接
              </label>
              <input
                id="pf-avatar"
                className={inputCls}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…（可选）"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-[12px] font-semibold text-ink2">外链</p>
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={link.id} className="flex items-center gap-2">
                <input
                  className={`${inputCls} max-w-[120px]`}
                  value={link.label}
                  onChange={(e) => setLinkAt(i, { label: e.target.value })}
                  placeholder="显示名"
                />
                <input
                  className={`${inputCls} flex-1`}
                  value={link.url}
                  onChange={(e) => setLinkAt(i, { url: e.target.value })}
                  placeholder="https://…"
                />
                <button
                  type="button"
                  aria-label="删除外链"
                  onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink3 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {links.length === 0 && (
              <p className="text-[12px] text-ink3">还没有外链，可添加 GitHub、邮箱页等</p>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setLinks((prev) => [...prev, { id: `lnk_${Date.now()}`, label: '', url: '' }])
            }
            className="mt-2 flex h-9 items-center gap-1.5 rounded-[10px] border border-dashed border-line2 px-3 text-[12.5px] font-medium text-ink2 hover:border-accent/50 hover:text-accent"
          >
            <Plus size={14} />
            添加外链
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => {
              const seed = DEFAULT_PROFILE
              setName(seed.name)
              setTagline(seed.tagline)
              setAvatarUrl(seed.avatarUrl ?? '')
              setLinks(seed.links.map((l) => ({ ...l })))
              updateProfile({
                name: seed.name,
                tagline: seed.tagline,
                avatarUrl: seed.avatarUrl,
                links: seed.links.map((l) => ({ ...l })),
              })
              toast('已恢复为 data/profile 默认名片')
            }}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line2 px-3.5 text-[12.5px] font-medium text-ink2 hover:bg-surface-2"
          >
            恢复默认
          </button>
          <button
            type="button"
            onClick={() => {
              setName(profile.name)
              setTagline(profile.tagline)
              setAvatarUrl(profile.avatarUrl ?? '')
              setLinks(profile.links)
            }}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line2 px-3.5 text-[12.5px] font-medium text-ink2 hover:bg-surface-2"
          >
            <X size={13} />
            重置表单
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex h-9 items-center rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-white hover:bg-accent-ink"
          >
            保存名片
          </button>
        </div>
      </div>
    </section>
  )
}
