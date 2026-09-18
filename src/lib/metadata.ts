/** 通过 Microlink 免费接口抓取网页标题/描述/封面/favicon（免 key，25 次/天） */
export interface PageMeta {
  title?: string
  description?: string
  cover?: string
  favicon?: string
}

type MicrolinkImage = { url?: string } | string | undefined

function unwrap(v: MicrolinkImage): string | undefined {
  if (!v) return undefined
  return typeof v === 'string' ? v : v.url
}

export async function fetchMetadata(url: string, timeoutMs = 6500): Promise<PageMeta> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
      { signal: controller.signal },
    )
    if (!res.ok) throw new Error(`microlink ${res.status}`)
    const json = (await res.json()) as {
      status?: string
      data?: {
        title?: string
        description?: string
        image?: MicrolinkImage
        logo?: MicrolinkImage
      }
    }
    if (json.status !== 'success' || !json.data) throw new Error('microlink bad payload')
    const d = json.data
    return {
      title: d.title?.trim() || undefined,
      description: d.description?.trim() || undefined,
      cover: unwrap(d.image),
      favicon: unwrap(d.logo),
    }
  } finally {
    window.clearTimeout(timer)
  }
}
