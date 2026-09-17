import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 相对路径 base，方便直接部署到任意静态托管的子目录（GitHub Pages 等）
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
