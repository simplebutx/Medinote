// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'window',
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});