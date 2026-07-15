import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 業務報告 API は backend root（/reports）にマウントされている（acceptance の契約に合わせる）。
      // ただし SPA のルート /reports/new と衝突するため、ブラウザのページ遷移（HTML 要求）は
      // index.html にフォールバックし、API 呼び出し（fetch=JSON）だけを backend へ転送する。
      '/reports': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
});
