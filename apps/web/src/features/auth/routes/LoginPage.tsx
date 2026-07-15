import { useNavigate } from 'react-router-dom';

/**
 * S1 ログイン（slice-06）。
 * - 「Google でログイン」ボタンを表示する。外部 OAuth は決定的フェイク（backend 側）。
 * - ログインでフェイクのセッション（staff01）を localStorage に保存し、ロール別ホームへ遷移する。
 */
export function LoginPage() {
  const navigate = useNavigate();

  const onLogin = (): void => {
    // フェイクのセッション。本物の OAuth を導入する際は backend の /auth/google へ遷移させる。
    localStorage.setItem('session', 'staff01');
    navigate('/home');
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
