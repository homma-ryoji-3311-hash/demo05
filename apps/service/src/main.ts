import { createApp } from './app.js';
import { loadEnv } from './common/config/env.js';
import { appLogger } from './common/logging/index.js';
import { PrismaService } from './common/infra/prisma/prismaService.js';
import { GreetingRepository } from './template/infra/repository/greetingRepository.js';

const env = loadEnv();

const prisma = new PrismaService(env.DATABASE_URL);

await prisma.connect();

const app = createApp({
  greetingRepository: new GreetingRepository(prisma),
});

const server = app.listen(env.PORT, () => {
  const baseUrl = `http://localhost:${env.PORT}`;
  if (env.NODE_ENV === 'production') {
    // 本番はログ集約向けに構造化した 1 行だけ出す
    appLogger.info({ port: env.PORT, env: env.APP_ENV }, 'api server started');
    return;
  }
  // 開発時は見やすい起動バナーを出す。
  // Local は開発時にブラウザで開くフロント（Vite dev server = apps/web、ポート 5173）を指す。
  const webUrl = 'http://localhost:5173';
  const line = '------------------------------------------------------------';
  appLogger.info(
    [
      '',
      line,
      '🚀  staff-report API server is up and running!',
      line,
      `  Local     : ${webUrl}`,
      `  Swagger   : ${baseUrl}/api/docs`,
      `  Env       : ${env.APP_ENV}`,
      line,
    ].join('\n'),
  );
});

// graceful shutdown: HTTP サーバを閉じてから DB 接続を解放する。
// keep-alive 接続で server.close が固まらないよう、既存接続を強制切断し、
// さらに一定時間で終わらない場合は強制終了して Ctrl+C で確実に落ちるようにする。
let shuttingDown = false;
const shutdown = (signal: string): void => {
  if (shuttingDown) {
    // 2 回目の Ctrl+C は即強制終了
    process.exit(1);
  }
  shuttingDown = true;
  appLogger.info(`received ${signal}, shutting down`);

  // 最大 5 秒で強制終了（graceful が固まっても確実に抜ける）。タイマー自体はプロセスを延命しない。
  const forceExit = setTimeout(() => {
    appLogger.warn('graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 5000);
  forceExit.unref();

  // keep-alive 等の既存接続を閉じて server.close のコールバックを発火させる
  server.closeAllConnections?.();
  server.close(() => {
    void prisma.disconnect().finally(() => process.exit(0));
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
