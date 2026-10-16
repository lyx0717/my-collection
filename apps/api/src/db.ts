import pg from 'pg'
import { config } from './config'

// connectionTimeoutMillis 必须有：库没起时快速失败，而不是挂在那里等
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 5000,
})

/**
 * 全部数据访问都走这里。
 * 涉及用户数据时 SQL 必须带 WHERE user_id = $1，且该参数一律取自会话、不信任请求体。
 */
export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(sql, params)
}

/** 需要多步原子操作时用（如按顺序重排） */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
