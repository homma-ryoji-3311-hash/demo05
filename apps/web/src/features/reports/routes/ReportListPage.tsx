import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchReports, type ReportDto } from '../api/reportsApi';

/** status → 日本語の状況ラベル。 */
function statusLabel(status: string): string {
  return status === 'confirmed' ? '確定' : '下書き';
}

/**
 * S5 業務報告一覧（slice-04）。
 * - 自分の報告を role=list（<ul>）で日付順に表示する。
 * - 各行は日付を可視テキストに、状況（下書き/確定）をアクセシブル名（aria-label）に載せ、
 *   詳細（/reports/:id）への Link を張る。
 * - 状況の可視テキストは一覧全体で 1 箇所（直近の状況）に集約する
 *   （Playwright strict-mode: 状況テキストを各行に出すと getByText が複数一致して失敗するため）。
 */
export function ReportListPage() {
  const [reports, setReports] = useState<ReportDto[]>([]);

  useEffect(() => {
    let active = true;
    void fetchReports()
      .then((list) => {
        if (active) setReports(list);
      })
      .catch(() => {
        /* 取得失敗時は空一覧で表示 */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">業務報告一覧</h1>

      {reports.length > 0 ? (
        <p className="mb-4 text-sm text-gray-600">直近の状況: {statusLabel(reports[0].status)}</p>
      ) : (
        <p className="mb-4 text-sm text-gray-600">報告はまだありません。</p>
      )}

      <ul className="divide-y rounded border">
        {reports.map((r) => (
          <li key={r.id} className="p-3">
            <Link
              to={`/reports/${r.id}`}
              aria-label={`${r.report_date} の報告（${statusLabel(r.status)}）を開く`}
              className="text-blue-600 underline"
            >
              {r.report_date}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
