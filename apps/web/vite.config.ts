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
      // 本人の履行状況 API（/me/report-status・slice-15）。SPA ルートに /me は無いので素の転送でよい。
      '/me': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 業務報告 API は backend root（/reports）にマウント（acceptance の契約=案A）。
      // SPA のルート /reports/new と衝突するため、ページ遷移（HTML 要求）は index.html に
      // フォールバックし、API 呼び出し（fetch=JSON）だけを backend へ転送する。
      '/reports': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      // S2 ホーム集約 API（/home・slice-07）。SPA のルート /home（page.goto）と衝突するため、
      // ページ遷移（HTML 要求）は index.html にフォールバックし、fetch=JSON だけを backend へ転送する。
      '/home': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      // S6 スキルシート閲覧 API（/skill-sheets・slice-09）。SPA のルート /skill-sheets（page.goto）と
      // 衝突するため、ページ遷移（HTML 要求）は index.html にフォールバックし、fetch（JSON/HTML プレビュー）
      // だけを backend へ転送する（/reports・/home と同型）。
      '/skill-sheets': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      // S7 テンプレート管理 API（/templates・slice-10）。SPA のルート /templates（page.goto）と衝突するため、
      // ページ遷移（HTML 要求）は index.html にフォールバックし、fetch（JSON）だけを backend へ転送する。
      '/templates': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      // S8 管理者コンソール API（/admin/staff・slice-14）。SPA のルート /admin/staff（page.goto）と衝突するため、
      // ページ遷移（HTML 要求）は index.html にフォールバックし、fetch（JSON）だけを backend へ転送する。
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      // S9 通知設定 API（/notification-settings・slice-13）。SPA のルート /notification-settings（page.goto）と
      // 衝突するため、ページ遷移（HTML 要求）は index.html にフォールバックし、fetch（JSON）だけを backend へ転送する。
      '/notification-settings': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      // S10 設問テンプレート API（/question-sets・slice-19）。SPA のルート /question-sets（page.goto）と衝突するため、
      // ページ遷移（HTML 要求）は index.html にフォールバックし、fetch（JSON）だけを backend へ転送する。
      '/question-sets': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      // S8 グループ設定 API（/groups・slice-22）。SPA ルートに /groups は無いので素の転送でよい（page.goto は /admin/group-settings）。
      '/groups': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 過去報告スナップショット API（/report-snapshots・slice-22）。SPA ルートに無いので素の転送。
      '/report-snapshots': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
