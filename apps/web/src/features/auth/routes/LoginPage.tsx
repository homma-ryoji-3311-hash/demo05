import { useNavigate } from 'react-router-dom';
import { setSession } from '../session';

/**
 * S1 ログイン（slice-06）。
 * 決定的フェイクの OAuth seam（PM決定）: ボタン押下でセッションを確立し、ロール別ホーム（/home・slice-07）へ遷移する。
 * 実 OAuth 導入時は onLogin を /auth/google/callback へのリダイレクト＋セッション保存に差し替える
 * （実クライアントシークレットは .env のみ・差分に出さない）。
 */
export function LoginPage() {
  const navigate = useNavigate();

  const onLogin = (): void => {
    setSession('staff01');
    navigate('/home');
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">ログイン</h1>
      <p className="mb-4 text-gray-600">スタッフレポートにログインしてください。</p>
      <button type="button" onClick={onLogin} className="rounded bg-blue-600 px-4 py-2 font-medium text-white">
        Google でログイン
      </button>
    </main>
  );
}
