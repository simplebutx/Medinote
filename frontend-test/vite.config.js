import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const consultationTarget = process.env.VITE_CONSULTATION_PROXY_TARGET ?? 'http://localhost:8082'
const medicationTarget = process.env.VITE_MEDICATION_PROXY_TARGET ?? 'http://localhost:8081'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
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
