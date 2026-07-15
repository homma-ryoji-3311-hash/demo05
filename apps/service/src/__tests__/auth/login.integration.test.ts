import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { InMemoryGreetingRepository } from '../support/inMemoryGreetingRepository.js';

// slice-01-auth-login（docs/spec/slice-01-auth-login.md）の受け入れテスト。
// Integration Test: モック禁止。InMemory実装を使ったcreateApp()で実際のHTTPフローを検証する。
//
// 現時点では POST /api/auth/login も認証関連の依存注入もまだ存在しない（実装不在）ため、
// 以下は全て赤になる想定（Cannot POST 404）。greetingRepository は createApp() の必須引数を
// 満たすためだけに渡している（このスライスの本題ではない）。
//
// 未解決の設計事項（工程6の実装者へ）:
// - Google ID トークンの検証をどう InMemory 化してテスト可能にするか（GoogleTokenVerifier のような
//   port を AppDependencies に追加し、テストではフェイク実装を注入する想定）。
// - USERS の事前登録をどう InMemory Repository に注入するか。
// 本テストでは idToken の文字列に「どのメールアドレスを表すか」を仮の規約として埋め込んでいるが、
// これはテストの意図を示すものであり、実装側のインターフェース設計を拘束しない。
describe('POST /api/auth/login', () => {
  it('AC-1: 事前登録済み・許可ドメインのユーザーはログインでき、JWTがhttpOnly Cookieに設定される', async () => {
    const app = createApp({ greetingRepository: new InMemoryGreetingRepository() });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ idToken: 'fake-google-id-token:taro.yamada@example-corp.test' });

    expect(res.status).toBe(200);
    expect(res.body.role).toMatch(/^(engineer|sales)$/);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie?.some((cookie: string) => /HttpOnly/i.test(cookie))).toBe(true);
  });

  it('AC-2: USERSに未登録のユーザーはログインを拒否される（403）', async () => {
    const app = createApp({ greetingRepository: new InMemoryGreetingRepository() });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ idToken: 'fake-google-id-token:unknown@example-corp.test' });

    expect(res.status).toBe(403);
  });
});
