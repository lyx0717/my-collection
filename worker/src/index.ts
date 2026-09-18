/**
 * 书签同步 API（Cloudflare Worker + KV）
 *
 * 鉴权：所有非 OPTIONS 请求必须带请求头
 *   Authorization: Bearer <你的密码>
 *
 * 接口：
 *   GET    /bookmarks            读取整库
 *   PUT    /bookmarks            整库覆盖（前端所有增删改后的保存）
 *   POST   /bookmarks/merge      合并（预留：多端冲突时使用）
 *   GET    /health               健康检查（无需鉴权）
 */

export interface Env {
  BOOKMARKS: KVNamespace
  AUTH_TOKEN: string
}

const KEY = 'data'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })
}

function authorized(req: Request, env: Env): boolean {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  return Boolean(env.AUTH_TOKEN) && token === env.AUTH_TOKEN
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    if (url.pathname === '/health' && req.method === 'GET') {
      return json({ ok: true, hasToken: Boolean(env.AUTH_TOKEN) })
    }

    if (url.pathname !== '/bookmarks') {
      return json({ error: 'Not found' }, 404)
    }

    if (!authorized(req, env)) {
      return json({ error: '未授权：密码错误' }, 401)
    }

    // 读取
    if (req.method === 'GET') {
      const raw = await env.BOOKMARKS.get(KEY)
      if (!raw) return json({ empty: true })
      try {
        return json(JSON.parse(raw))
      } catch {
        return json({ error: '云端数据格式错误' }, 500)
      }
    }

    // 整库写入
    if (req.method === 'PUT') {
      let body: unknown
      try {
        body = await req.json()
      } catch {
        return json({ error: '请求体不是合法 JSON' }, 400)
      }
      const data = body as {
        bookmarks?: unknown[]
        collections?: unknown[]
      }
      if (!Array.isArray(data.bookmarks) || !Array.isArray(data.collections)) {
        return json({ error: '数据必须包含 bookmarks 和 collections 数组' }, 400)
      }
      // 简单大小保护（KV 单值上限 25MB）
      const text = JSON.stringify(body)
      if (text.length > 20 * 1024 * 1024) {
        return json({ error: '数据超过 20MB' }, 413)
      }
      await env.BOOKMARKS.put(KEY, text)
      return json({ ok: true, savedAt: new Date().toISOString(), bytes: text.length })
    }

    return json({ error: 'Method not allowed' }, 405)
  },
}
