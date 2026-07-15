import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHome, type HomeDto } from '../api/homeApi';

/** today_status → 今日の報告状況の表示テキスト。 */
function statusText(status: string | undefined): string {
  if (status === 'draft_exists' || status === 'draft') return '下書き';
  if (status === 'confirmed') return '確定済み';
  return '未報告';
}

/**
 * S2 スタッフ用ホーム（slice-07）。
 * - 今日の報告状況（未報告/下書き/確定済み）をテキストで表示する。
 * - 下書きへの導線と報告入力（S3）への導線を Link で表示する。
 *   状況テキストと重複しないよう、下書き導線の可視名は状況語を含めず aria-label で補う
 *   （Playwright strict-mode 対策）。
 * - /home が取得できない場合も既定（未報告）と固定導線で degrade する。
 */
export function HomePage() {
  const [home, setHome] = useState<HomeDto | null>(null);

  useEffect(() => {
    let active = true;
    void fetchHome()
      .then((res) => {
        if (active) setHome(res);
      })
      .catch(() => {
        /* 取得失敗時は既定表示（未報告）で degrade */
      });
    return () => {
      active = false;
    };
  }, []);

  const draftsHref = home?.links.drafts ?? '/reports?status=draft';
  const newReportHref = home?.links.new_report ?? '/reports/new';

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">ホーム</h1>

      <p className="mb-6 text-lg">
        今日の報告状況: <span className="font-semibold">{statusText(home?.today_status)}</span>
      </p>

      <nav className="flex gap-3">
        <Link to={newReportHref} className="rounded bg-blue-600 px-4 py-2 text-white">
          報告入力
        </Link>
        <Link to={draftsHref} aria-label="下書きを開く" className="rounded border px-4 py-2">
          続きを書く
        </Link>
      </nav>
    </main>
  );
}
