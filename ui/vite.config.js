import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    assetsDir: 'assets',
  },
  css: {
    postcss: './postcss.config.js',
  },
})
