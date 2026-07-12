import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  // Node ランタイムの動作モード（ログ整形やフレームワーク挙動の切替に使う）
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // デプロイ環境（アプリ的な環境区分。表示や環境別設定に使う）
  APP_ENV: z.enum(['dev', 'stg', 'prd']).default('dev'),
  DATABASE_URL: z.string().min(1),
  // ロガーの出力レベル（pino）。未指定なら logger 側で info。
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
