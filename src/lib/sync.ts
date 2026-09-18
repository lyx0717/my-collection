import type { StoreShape } from '../types'

const CFG_KEY = 'mybookmarks:sync-config'

export interface SyncConfig {
  /** Worker 基础地址，如 https://my-bookmarks-api.xxx.workers.dev */
  endpoint: string
  token: string
}

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SyncConfig
    if (!parsed.endpoint || !parsed.token) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSyncConfig(cfg: SyncConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
}

export function clearSyncConfig() {
  localStorage.removeItem(CFG_KEY)
}

function apiUrl(endpoint: string, path: string): string {
  return `${endpoint.replace(/\/+$/, '')}${path}`
}

async function request<T>(
  cfg: SyncConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(apiUrl(cfg.endpoint, path), {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    const text = await res.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }
    if (!res.ok) {
      const message =
        body && typeof body === 'object' && 'error' in body
          ? String((body as { error: unknown }).error)
          : `请求失败 ${res.status}`
      throw new Error(message)
    }
    return body as T
  } finally {
    window.clearTimeout(timer)
  }
}

export async function fetchCloud(cfg: SyncConfig): Promise<StoreShape | null> {
  const body = await request<StoreShape | { empty?: true }>(cfg, '/bookmarks')
  if (body && 'empty' in body && body.empty) return null
  return body as StoreShape
}

export async function saveCloud(cfg: SyncConfig, data: StoreShape): Promise<{ savedAt: string }> {
  return request(cfg, '/bookmarks', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function checkHealth(cfg: SyncConfig): Promise<boolean> {
  // 不带密码访问健康检查，再带密码读一次验证鉴权
  await request(cfg, '/bookmarks', { method: 'GET' })
  return true
}
