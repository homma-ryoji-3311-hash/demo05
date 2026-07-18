import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHome, type HomeDto, type TodayStatus } from '../api/homeApi';

/**
 * S2 スタッフ用ホーム（slice-07）。
 * - 今日の報告状況を **色だけでなくテキスト**で示す（非機能要件）。状態テキストは role="status" に閉じ、
 *   導線リンクの「下書き」という語と衝突させない（ui.spec の strict mode 対策）。
 * - 未確定下書きへの導線（links.drafts）と報告入力(S3)への導線（links.new_report）を表示する。
 */
const STATUS_TEXT: Record<TodayStatus, string> = {
  none: '今日の報告はまだありません',
  draft_exists: '書きかけの下書きがあります',
  confirmed: '今日の報告は確定済みです',
};

type LoadState = 'loading' | 'ready' | 'failed';

export function HomePage() {
  const [home, setHome] = useState<HomeDto | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    void fetchHome()
      .then((data) => {
        if (!active) return;
        setHome(data);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, []);

  const statusText =
    state === 'loading'
      ? '読み込んでいます'
      : state === 'failed'
        ? 'ホーム情報を取得できませんでした。再試行してください'
        : home
          ? STATUS_TEXT[home.today_status]
          : '';

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">ホーム</h1>

      {/* 状態テキストは status ロール1つに閉じる（導線リンクの「下書き」と語が衝突しないように）。 */}
      <p role="status" aria-live="polite" className="mb-6 text-lg">
        {statusText}
      </p>

      <nav className="flex flex-col gap-3">
        {home?.links.drafts && (
          <Link to={home.links.drafts} className="text-blue-700 underline">
            下書きの続きを書く
          </Link>
        )}
        <Link to={home?.links.new_report ?? '/reports/new'} className="text-blue-700 underline">
          新規報告を作成
        </Link>
      </nav>
    </main>
  );
}
