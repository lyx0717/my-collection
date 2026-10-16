import { migrate } from '../src/migrate'
import { pool } from '../src/db'

await migrate()
await pool.end()
