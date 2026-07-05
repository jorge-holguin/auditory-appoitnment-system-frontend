// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: 3005,
    strictPort: false,
    proxy: {
      '/auth-service': {
        target: 'https://datuq.minsa.gob.pe',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'https://datuq.minsa.gob.pe')
          })
        },
      },
      '/fhir-service': {
        target: 'https://datuq.minsa.gob.pe',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'https://datuq.minsa.gob.pe')
          })
        },
      },
    },
  }
})
