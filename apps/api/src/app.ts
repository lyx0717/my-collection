import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance } from 'fastify'
import { AppError } from './errors'
import authRoutes from './routes/auth'
import bookmarkRoutes from './routes/bookmarks'
import collectionRoutes from './routes/collections'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : { level: 'info' },
  })

  // cookie 必须先注册，后面的路由才能拿到 req.cookies
  await app.register(cookie)

  app.get('/api/v1/healthz', async () => ({ ok: true }))

  await app.register(
    async (api) => {
      await api.register(authRoutes)
      await api.register(bookmarkRoutes)
      await api.register(collectionRoutes)
    },
    { prefix: '/api/v1' },
  )

  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.status).send({ error: { code: err.code, message: err.message } })
    }

    const { code, statusCode } = err as { code?: string; statusCode?: number }

    // 唯一索引冲突统一转 409，不把 PG 细节抛给客户端
    if (code === '23505') {
      return reply.code(409).send({ error: { code: 'CONFLICT', message: '已存在相同的记录' } })
    }
    // 请求体不是合法 JSON 之类由 Fastify 判定的 4xx
    if (statusCode && statusCode < 500) {
      return reply
        .code(statusCode)
        .send({ error: { code: 'VALIDATION', message: '请求格式不正确' } })
    }

    req.log.error(err)
    return reply.code(500).send({ error: { code: 'INTERNAL', message: '服务器内部错误' } })
  })

  return app
}
