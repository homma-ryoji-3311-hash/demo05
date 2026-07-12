import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.js';

/**
 * アプリ全体で共有する Prisma クライアント。
 * PrismaClient を継承し、pg アダプタの組み立て（接続文字列）をこのクラスに閉じ込める。
 * コンポジションルート（main.ts）で 1 インスタンスだけ生成し、各リポジトリへ注入する。
 */
export class PrismaService extends PrismaClient {
  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  /** アプリ起動時に DB へ接続する。 */
  async connect(): Promise<void> {
    await this.$connect();
  }

  /** アプリ終了時に DB 接続を解放する（graceful shutdown）。 */
  async disconnect(): Promise<void> {
    await this.$disconnect();
  }
}
