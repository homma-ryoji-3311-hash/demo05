import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/__test__/setup';
// 実装コンポーネントを import して render する（ADR-0018）。
// この2つのコンポーネントはまだ存在しない（実装不在）ため、本ファイルはモジュール解決エラーで
// 赤になる想定。パスは工程6の実装者への想定インターフェースであり、拘束するものではない。
import { LoginPage } from '@/features/auth/routes/LoginPage';
import { HomeRoute } from '@/features/auth/routes/HomeRoute';

// slice-01-auth-login（docs/spec/slice-01-auth-login.md）の受け入れテスト。UI 層（RTL + MSW）。

describe('AC-3: ログイン画面に最小限のログイン導線がある', () => {
  it('「Google でログイン」ボタンが表示され、クリックできる', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const button = screen.getByRole('button', { name: 'Google でログイン' });
    expect(button).toBeInTheDocument();

    await user.click(button);
    // 外部 OAuth 遷移そのものはこのテストの対象外（モックする）。
    // クリックが例外を投げずにハンドリングされることのみを確認する。
  });
});

describe('AC-4: ログイン成功後、ロールに応じたホームへ遷移する', () => {
  it('ロールが engineer ならエンジニア用ホーム画面(2)を表示する', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ role: 'engineer' })));

    render(<HomeRoute />);

    expect(await screen.findByText('今日の報告状況')).toBeInTheDocument();
  });

  it('ロールが sales なら営業担当用ホーム画面(6)を表示する', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ role: 'sales' })));

    render(<HomeRoute />);

    expect(await screen.findByText('担当エンジニア一覧')).toBeInTheDocument();
  });
});
