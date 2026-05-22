import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'

const isDocker = existsSync('/.dockerenv')

const consultationTarget =
  process.env.VITE_CONSULTATION_PROXY_TARGET ??
  (isDocker ? 'http://backend-consultation:8082' : 'http://localhost:8082')
const medicationTarget =
  process.env.VITE_MEDICATION_PROXY_TARGET ??
  (isDocker ? 'http://backend-medication:8081' : 'http://localhost:8081')
const authTarget =
  process.env.VITE_AUTH_PROXY_TARGET ??
  (isDocker ? 'http://backend-auth:8080' : 'http://localhost:8080')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth': {
        target: authTarget,
        changeOrigin: true,
      },
      '/api/chatbot': {
        target: consultationTarget,
        changeOrigin: true,
      },
      '/api/medicines': {
        target: medicationTarget,
        changeOrigin: true,
      },
      '/api': {
        target: medicationTarget,
        changeOrigin: true,
      },
    },
  },
})
