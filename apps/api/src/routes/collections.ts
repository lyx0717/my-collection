import type { FastifyInstance } from 'fastify'
import type { Collection } from '@my-collection/shared/types'
import { requireAuth } from '../auth'
import { query, withTransaction } from '../db'
import { badRequest, conflict, notFound } from '../errors'
import { obj, optStr, str, uuid, uuidArray } from '../validate'

const COLS = `id, name, icon, sort_order AS "order"`

export default async function collectionRoutes(app: FastifyInstance): Promise<void> {
  app.post('/collections', { onRequest: requireAuth }, async (req, reply) => {
    const body = obj(req.body)
    const name = str(body.name, '分组名', 100)
    const icon = optStr(body.icon, '图标', 100)

    const exists = await query(
      'SELECT 1 FROM collections WHERE user_id = $1 AND lower(btrim(name)) = lower($2)',
      [req.userId, name],
    )
    if (exists.rowCount) throw conflict('已存在同名分组')

    const created = await query<Collection>(
      `INSERT INTO collections (user_id, name, icon, sort_order)
       VALUES ($1, $2, $3,
         (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM collections WHERE user_id = $1))
       RETURNING ${COLS}`,
      [req.userId, name, icon ?? null],
    )
    return reply.code(201).send({ collection: created.rows[0] })
  })

  app.patch<{ Params: { id: string } }>(
    '/collections/:id',
    { onRequest: requireAuth },
    async (req) => {
      const id = uuid(req.params.id, '分组 id')
      const body = obj(req.body)
      const name = str(body.name, '分组名', 100)
      const icon = optStr(body.icon, '图标', 100)

      const clash = await query(
        'SELECT 1 FROM collections WHERE user_id = $1 AND lower(btrim(name)) = lower($2) AND id <> $3',
        [req.userId, name, id],
      )
      if (clash.rowCount) throw conflict('已存在同名分组')

      const updated = await query<Collection>(
        `UPDATE collections SET name = $3, icon = $4
         WHERE user_id = $1 AND id = $2
         RETURNING ${COLS}`,
        [req.userId, id, name, icon ?? null],
      )
      if (!updated.rows[0]) throw notFound('分组不存在')
      return { collection: updated.rows[0] }
    },
  )

  // 删分组不删书签：bookmarks.collection_id 是 ON DELETE SET NULL
  app.delete<{ Params: { id: string } }>(
    '/collections/:id',
    { onRequest: requireAuth },
    async (req, reply) => {
      const removed = await query('DELETE FROM collections WHERE user_id = $1 AND id = $2', [
        req.userId,
        uuid(req.params.id, '分组 id'),
      ])
      if (!removed.rowCount) throw notFound('分组不存在')
      return reply.code(204).send()
    },
  )

  app.put('/collections/order', { onRequest: requireAuth }, async (req, reply) => {
    const orderedIds = uuidArray(obj(req.body).orderedIds, '分组 id')
    const owned = await query<{ id: string }>('SELECT id FROM collections WHERE user_id = $1', [
      req.userId,
    ])
    const ownedIds = new Set(owned.rows.map((row) => row.id))
    if (orderedIds.length !== ownedIds.size || orderedIds.some((id) => !ownedIds.has(id)))
      throw badRequest('排序列表必须包含全部分组')

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE collections c SET sort_order = v.ord - 1
         FROM (SELECT id, ordinality AS ord FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, ord)) v
         WHERE c.id = v.id AND c.user_id = $2`,
        [orderedIds, req.userId],
      )
    })
    return reply.code(204).send()
  })

  // 导入时按名称批量建分组；已存在的直接返回，
  // 便于前端建「文件夹名 → 分组 id」映射后再提交书签。
  app.post('/collections/bulk', { onRequest: requireAuth }, async (req) => {
    const raw = obj(req.body).names
    if (!Array.isArray(raw)) throw badRequest('names 必须是数组')
    const names = [...new Set(raw.map((name) => str(name, '分组名', 100)))]

    return withTransaction(async (client) => {
      const existing = await client.query<Collection>(
        `SELECT ${COLS} FROM collections WHERE user_id = $1`,
        [req.userId],
      )
      const byName = new Map(existing.rows.map((c) => [c.name.toLowerCase(), c]))
      let order = existing.rows.reduce((max, c) => Math.max(max, c.order), -1) + 1

      const collections: Collection[] = []
      for (const name of names) {
        const hit = byName.get(name.toLowerCase())
        if (hit) {
          collections.push(hit)
          continue
        }
        const created = await client.query<Collection>(
          `INSERT INTO collections (user_id, name, icon, sort_order)
           VALUES ($1, $2, NULL, $3) RETURNING ${COLS}`,
          [req.userId, name, order++],
        )
        collections.push(created.rows[0])
      }
      return { collections }
    })
  })
}
