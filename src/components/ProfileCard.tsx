import { useState } from 'react'
import { profileInitial } from '../lib/profile'
import { letterColor } from '../lib/color'
import { useProfile } from '../store/ProfileContext'

/** 首页个人名片区：头像、昵称、一句话、外链 */
export default function ProfileCard({ className = '' }: { className?: string }) {
  const { profile } = useProfile()
  const [imgFailed, setImgFailed] = useState(false)
  const initial = profileInitial(profile.name)
  const color = letterColor(profile.name || profile.tagline || '?')
  const showImg = Boolean(profile.avatarUrl) && !imgFailed

  return (
    <section
      className={`flex flex-wrap items-center gap-3.5 rounded-2xl border border-line bg-surface/80 px-4 py-3.5 shadow-[0_1px_2px_rgba(30,40,60,.05)] backdrop-blur-sm sm:px-5 ${className}`}
    >
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line"
        style={{ background: showImg ? '#fff' : color.bg }}
      >
        {showImg ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-[18px] font-bold" style={{ color: color.fg }}>
            {initial}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-bold leading-tight text-ink">{profile.name}</h2>
        {profile.tagline && (
          <p className="mt-0.5 truncate text-[12.5px] leading-5 text-ink3">{profile.tagline}</p>
        )}
      </div>

      {profile.links.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {profile.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink2 transition-colors hover:border-accent/40 hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
