import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 相对路径 base，方便直接部署到任意静态托管的子目录（GitHub Pages 等）
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    // 开发时把 /api 转给本地后端。浏览器视角始终同源（localhost:5173），
    // cookie 落在 localhost，因此不需要 CORS。
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
