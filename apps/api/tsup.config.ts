import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  // shared 是 TS 源码、没有构建产物，必须打进 bundle；
  // 其余依赖保持 external，运行时从 node_modules 解析。
  noExternal: ['@my-collection/shared'],
})
