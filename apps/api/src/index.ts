import { buildApp } from './app'
import { config } from './config'
import { pool } from './db'

const app = await buildApp()
await app.listen({ port: config.port, host: config.host })
console.log(`API 已启动：http://${config.host}:${config.port}/api/v1`)

// 退出时先关 HTTP 再断连接池，避免残留连接
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => pool.end())
  })
}
