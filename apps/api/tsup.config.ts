import { defineConfig } from 'tsup'

export default defineConfig({
  // 三个入口：
  //   index   —— 常驻服务
  //   migrate —— 部署时一次性跑迁移
  //   reset   —— 忘密码时的离线重置工具（命令行用）
  // 曾用数组写法只构建 index，导致部署脚本引用 dist/migrate.js 时文件不存在。
  entry: {
    index: 'src/index.ts',
    migrate: 'migrations/run.ts',
    reset: 'src/cli/reset.ts',
  },
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  // shared 是 TS 源码、没有构建产物，必须打进 bundle；
  // 其余依赖保持 external，运行时从 node_modules 解析。
  noExternal: ['@my-collection/shared'],
})
