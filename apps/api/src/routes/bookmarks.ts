import type { FastifyInstance } from 'fastify'
import type { Bookmark, BookmarkDraft, Collection } from '@my-collection/shared/types'
import { dedupeKey, extractDomain, isValidUrl, normalizeUrl } from '@my-collection/shared/url'
import { requireAuth } from '../auth'
import { query, withTransaction } from '../db'
import { badRequest, conflict, notFound } from '../errors'
import { obj, optStr, optUuid, str, uuid, uuidArray } from '../validate'

/** 列别名直接对齐 Bookmark 类型，省掉逐行映射 */
const COLS = `id, url, title, description, domain,
  favicon_url AS "faviconUrl", cover, collection_id AS "collectionId",
  sort_order AS "order", created_at AS "createdAt", updated_at AS "updatedAt"`

/** 把请求体读成一条待入库的书签；url 在这里归一化 */
function readDraft(raw: Record<string, unknown>): BookmarkDraft {
  const url = normalizeUrl(str(raw.url, '链接', 2000))
  if (!isValidUrl(url)) throw badRequest('请输入以 http:// 或 https:// 开头的有效链接')
  const domain = extractDomain(url)
  return {
    url,
    // 导入源常常没有标题，退化成域名而不是报错
    title: optStr(raw.title, '标题', 500) ?? (domain || url),
    description: optStr(raw.description, '描述', 2000),
    faviconUrl: optStr(raw.faviconUrl, '图标', 2000),
    cover: optStr(raw.cover, '封面', 2000),
    collectionId: optUuid(raw.collectionId, '分组'),
    createdAt: optStr(raw.createdAt, '收录时间', 40),
  }
}

/** 分组必须属于当前用户，否则视为未分组（没有复合外键，这里兜底） */
async function dropForeignCollections(userId: string, drafts: BookmarkDraft[]): Promise<void> {
  const ids = [...new Set(drafts.map((d) => d.collectionId).filter((id): id is string => !!id))]
  if (ids.length === 0) return
  const owned = await query<{ id: string }>(
    'SELECT id FROM collections WHERE user_id = $1 AND id = ANY($2::uuid[])',
    [userId, ids],
  )
  const ok = new Set(owned.rows.map((row) => row.id))
  for (const draft of drafts) {
    if (draft.collectionId && !ok.has(draft.collectionId)) draft.collectionId = undefined
  }
}

async function assertOwnCollection(userId: string, collectionId: string): Promise<void> {
  const owned = await query('SELECT 1 FROM collections WHERE user_id = $1 AND id = $2', [
    userId,
    collectionId,
  ])
  if (!owned.rowCount) throw notFound('分组不存在')
}

/** 批量插入；dedupe_key 冲突的条目直接跳过，返回真正写入的行 */
async function insertDrafts(userId: string, drafts: BookmarkDraft[]): Promise<Bookmark[]> {
  if (drafts.length === 0) return []
  await dropForeignCollections(userId, drafts)

  const next = await query<{ base: number }>(
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS base FROM bookmarks WHERE user_id = $1',
    [userId],
  )
  const base = next.rows[0].base

  const params: unknown[] = [userId]
  const tuples = drafts.map((draft, index) => {
    const p = params.length + 1 // 本条第一个占位符的编号
    params.push(
      draft.url,
      draft.title,
      draft.description ?? null,
      extractDomain(draft.url),
      draft.faviconUrl ?? null,
      draft.cover ?? null,
      draft.collectionId ?? null,
      dedupeKey(draft.url),
      base + index,
      draft.createdAt ?? null,
    )
    // created_at 是 NOT NULL：导入没带时间时用库里的 now()
    return `($1, $${p}, $${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, $${p + 8}, COALESCE($${p + 9}, now()))`
  })

  const inserted = await query<Bookmark>(
    `INSERT INTO bookmarks
       (user_id, url, title, description, domain, favicon_url, cover, collection_id,
        dedupe_key, sort_order, created_at)
     VALUES ${tuples.join(', ')}
     ON CONFLICT (user_id, dedupe_key) DO NOTHING
     RETURNING ${COLS}`,
    params,
  )
  return inserted.rows
}

export default async function bookmarkRoutes(app: FastifyInstance): Promise<void> {
  // 一次拉全量：前端已有完整的本地筛选（搜索 / 分组 / 域名 / 排序），
  // 个人量级（数百到数千条）没必要做服务端分页。
  app.get('/library', { onRequest: requireAuth }, async (req) => {
    const [bookmarks, collections] = await Promise.all([
      query<Bookmark>(`SELECT ${COLS} FROM bookmarks WHERE user_id = $1 ORDER BY sort_order`, [
        req.userId,
      ]),
      query<Collection>(
        `SELECT id, name, icon, sort_order AS "order" FROM collections
         WHERE user_id = $1 ORDER BY sort_order`,
        [req.userId],
      ),
    ])
    return { bookmarks: bookmarks.rows, collections: collections.rows }
  })

  // 设置页的「清空全部数据」
  app.delete('/library', { onRequest: requireAuth }, async (req, reply) => {
    await query('DELETE FROM bookmarks WHERE user_id = $1', [req.userId])
    await query('DELETE FROM collections WHERE user_id = $1', [req.userId])
    return reply.code(204).send()
  })

  app.post('/bookmarks', { onRequest: requireAuth }, async (req, reply) => {
    const draft = readDraft(obj(req.body))
    const [created] = await insertDrafts(req.userId, [draft])
    if (!created) throw conflict('这条链接已经收藏过了')
    return reply.code(201).send({ bookmark: created })
  })

  // 编辑弹窗会提交完整字段，所以这里整条覆盖而不是逐字段拼 SQL
  app.patch<{ Params: { id: string } }>(
    '/bookmarks/:id',
    { onRequest: requireAuth },
    async (req) => {
      const id = uuid(req.params.id, '书签 id')
      const draft = readDraft(obj(req.body))
      await dropForeignCollections(req.userId, [draft])

      const updated = await query<Bookmark>(
        `UPDATE bookmarks SET
           url = $3, title = $4, description = $5, domain = $6,
           favicon_url = $7, cover = $8, collection_id = $9, dedupe_key = $10,
           updated_at = now()
         WHERE user_id = $1 AND id = $2
         RETURNING ${COLS}`,
        [
          req.userId,
          id,
          draft.url,
          draft.title,
          draft.description ?? null,
          extractDomain(draft.url),
          draft.faviconUrl ?? null,
          draft.cover ?? null,
          draft.collectionId ?? null,
          dedupeKey(draft.url),
        ],
      )
      if (!updated.rows[0]) throw notFound('书签不存在')
      return { bookmark: updated.rows[0] }
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/bookmarks/:id',
    { onRequest: requireAuth },
    async (req, reply) => {
      const removed = await query('DELETE FROM bookmarks WHERE user_id = $1 AND id = $2', [
        req.userId,
        uuid(req.params.id, '书签 id'),
      ])
      if (!removed.rowCount) throw notFound('书签不存在')
      return reply.code(204).send()
    },
  )

  // 拖拽排序。客户端会先把「可见子集」展开成全局顺序再提交，
  // 所以这里要求 id 集合与该用户全部书签完全一致 —— 否则未提交的条目顺序会被打乱。
  app.put('/bookmarks/order', { onRequest: requireAuth }, async (req, reply) => {
    const orderedIds = uuidArray(obj(req.body).orderedIds, '书签 id')
    const owned = await query<{ id: string }>('SELECT id FROM bookmarks WHERE user_id = $1', [
      req.userId,
    ])
    const ownedIds = new Set(owned.rows.map((row) => row.id))
    if (orderedIds.length !== ownedIds.size || orderedIds.some((id) => !ownedIds.has(id)))
      throw badRequest('排序列表必须包含全部书签')

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE bookmarks b SET sort_order = v.ord - 1, updated_at = now()
         FROM (SELECT id, ordinality AS ord FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, ord)) v
         WHERE b.id = v.id AND b.user_id = $2`,
        [orderedIds, req.userId],
      )
    })
    return reply.code(204).send()
  })

  // 导入：一次提交多条，重复的跳过
  app.post('/bookmarks/bulk', { onRequest: requireAuth }, async (req) => {
    const raw = obj(req.body).drafts
    if (!Array.isArray(raw)) throw badRequest('drafts 必须是数组')
    const drafts = raw.map((item) => readDraft(obj(item)))
    const created = await insertDrafts(req.userId, drafts)
    return { created: created.length, skipped: drafts.length - created.length, bookmarks: created }
  })

  // 批量移动分组
  app.patch('/bookmarks/bulk', { onRequest: requireAuth }, async (req) => {
    const body = obj(req.body)
    const ids = uuidArray(body.ids, '书签 id')
    const collectionId = optUuid(obj(body.patch).collectionId, '分组')
    if (collectionId) await assertOwnCollection(req.userId, collectionId)

    const updated = await query(
      `UPDATE bookmarks SET collection_id = $3, updated_at = now()
       WHERE user_id = $1 AND id = ANY($2::uuid[])`,
      [req.userId, ids, collectionId ?? null],
    )
    return { updated: updated.rowCount ?? 0 }
  })

  app.post('/bookmarks/bulk-delete', { onRequest: requireAuth }, async (req) => {
    const ids = uuidArray(obj(req.body).ids, '书签 id')
    const removed = await query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND id = ANY($2::uuid[])',
      [req.userId, ids],
    )
    return { deleted: removed.rowCount ?? 0 }
  })
}
