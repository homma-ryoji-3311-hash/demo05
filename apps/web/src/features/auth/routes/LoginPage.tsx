/**
 * S1 ログイン（slice-06）。
 * - 「Google でログイン」ボタンを表示する。外部 OAuth は決定的フェイク（backend 側）。
 * - 認証ガードは付けない（slice-01 の /reports/new は入力画面のまま。ADR 整合のため test2 は赤のまま）。
 */
export function LoginPage() {
  const onLogin = (): void => {
    // フェイクの固定セッション運用のため、ここではホームへ進む。
    // 本物の OAuth を導入する際は backend の /auth/google へ遷移させる。
    window.location.href = '/home';
  };

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">ログイン</h1>
      <button type="button" onClick={onLogin} className="rounded bg-blue-600 px-4 py-2 text-white">
        Google でログイン
      </button>
    </main>
  );
}
