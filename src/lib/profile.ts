import { SEED_PROFILE } from '../data/profile'

export interface ProfileLink {
  id: string
  label: string
  url: string
}

export interface Profile {
  name: string
  tagline: string
  /** 头像 URL；空则用姓名首字色块 */
  avatarUrl?: string
  links: ProfileLink[]
}

const PROFILE_KEY = 'mybookmarks:profile'

/** 默认值在 src/data/profile.ts，便于像 seed.ts 一样固化个人信息 */
export const DEFAULT_PROFILE = SEED_PROFILE

function cloneSeed(): Profile {
  return {
    name: SEED_PROFILE.name,
    tagline: SEED_PROFILE.tagline,
    avatarUrl: SEED_PROFILE.avatarUrl,
    links: SEED_PROFILE.links.map((l) => ({ ...l })),
  }
}

export function loadProfile(): Profile {
  const fallback = cloneSeed()
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      name: parsed.name?.trim() || fallback.name,
      tagline: parsed.tagline ?? fallback.tagline,
      avatarUrl: parsed.avatarUrl || undefined,
      links: Array.isArray(parsed.links)
        ? parsed.links
            .filter((l) => l && typeof l.label === 'string' && typeof l.url === 'string')
            .map((l, i) => ({ id: l.id || `lnk_${i}`, label: l.label, url: l.url }))
        : fallback.links,
    }
  } catch {
    return fallback
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // ignore
  }
}

export function profileInitial(name: string): string {
  const t = (name || '').trim()
  if (!t) return '?'
  const emoji = t.match(/^\p{Extended_Pictographic}/u)
  if (emoji) return emoji[0]
  const ch = t.match(/[\p{L}\p{N}]/u)
  return ch ? ch[0].toUpperCase() : [...t][0]
}
