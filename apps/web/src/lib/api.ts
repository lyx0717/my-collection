import type { ApiErrorBody, ErrorCode } from '@my-collection/shared/types'

/** 后端返回的业务错误，message 可直接展示给用户 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}

// 会话失效时的全局回调，由 AuthProvider 注册；路由守卫据此跳登录页
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

const BASE = '/api/v1'

/**
 * 始终用相对路径：开发时 Vite 代理到 3000，生产由 nginx 同源反代，
 * 两边都不需要 CORS，因此也不需要 VITE_API_BASE 之类的环境变量。
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  })

  if (res.status === 401) {
    onUnauthorized?.()
    throw new ApiError(401, 'UNAUTHENTICATED', '登录已过期，请重新登录')
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'INTERNAL',
      body?.error?.message ?? `请求失败（${res.status}）`,
    )
  }

  // 204 没有响应体，直接返回 undefined
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

const body = (value: unknown) => (value === undefined ? undefined : JSON.stringify(value))

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, value?: unknown) => request<T>(path, { method: 'POST', body: body(value) }),
  patch: <T>(path: string, value: unknown) => request<T>(path, { method: 'PATCH', body: body(value) }),
  put: <T>(path: string, value: unknown) => request<T>(path, { method: 'PUT', body: body(value) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
