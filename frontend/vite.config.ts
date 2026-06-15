// vite.config.ts
import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const isDocker = existsSync('/.dockerenv');

const authTarget = isDocker
  ? 'http://backend-auth:8080'
  : 'http://localhost:8080';
const medicationTarget = isDocker
  ? 'http://backend-medication:8081'
  : 'http://localhost:8081';
const consultationTarget = isDocker
  ? 'http://backend-consultation:8082'
  : 'http://localhost:8082';
const aiTarget = isDocker
  ? 'http://ai-server:8000'
  : 'http://localhost:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'window',
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/auth': {
        target: authTarget,
        changeOrigin: true,
      },
      '/api/admin': {
        target: authTarget,
        changeOrigin: true,
      },
      '/api/ws-stomp': {
        target: consultationTarget,
        changeOrigin: true,
        ws: true,
      },
      '/api/chatbot': {
        target: consultationTarget,
        changeOrigin: true,
      },
      '/api/consultation-notifications': {
        target: consultationTarget,
        changeOrigin: true,
      },
      '/app/consult': {
        target: consultationTarget,
        changeOrigin: true,
      },
      '/api/ai': {
        target: aiTarget,
        changeOrigin: true,
      },
      '/api': {
        target: medicationTarget,
        changeOrigin: true,
      },
    },
  },
});
