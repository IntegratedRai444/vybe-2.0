import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, 'src')
      },
      {
        find: '@components',
        replacement: resolve(__dirname, 'src/components')
      },
      {
        find: '@lib',
        replacement: resolve(__dirname, 'src/lib')
      },
      {
        find: '@hooks',
        replacement: resolve(__dirname, 'src/hooks')
      },
      {
        find: '@types',
        replacement: resolve(__dirname, 'src/types')
      },
      {
        find: '@assets',
        replacement: resolve(__dirname, 'src/assets')
      }
    ]
  },
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    open: true,
    cors: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
})