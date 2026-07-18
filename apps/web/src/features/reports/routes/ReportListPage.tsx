import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchReports, type ReportDto } from '../api/reportsApi';

/**
 * S5 業務報告一覧（slice-04 AC-1 の画面側）。
 * - 自分の報告のみ・日付の新しい順（絞り込みと並びは backend が担う）。
 * - 各行に日付と状況（下書き/確定）をテキストで示す（色だけに頼らない・非機能要件）。
 * - 行は詳細へのリンク。
 */
const STATUS_LABEL: Record<string, string> = { draft: '下書き', confirmed: '確定' };

type LoadState = 'loading' | 'ready' | 'failed';

export function ReportListPage() {
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    void fetchReports()
      .then((list) => {
        if (!active) return;
        setReports(list);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">業務報告一覧</h1>

      {state === 'ready' && (
        <ul className="divide-y rounded border">
          {reports.map((report) => (
            <li key={report.id}>
              <Link to={`/reports/${report.id}`} className="flex gap-4 p-3 hover:bg-gray-50">
                <span>{report.report_date}</span>
                <span>{STATUS_LABEL[report.status] ?? report.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
        {state === 'loading' && '読み込んでいます'}
        {state === 'failed' && '一覧を取得できませんでした。再試行してください'}
        {state === 'ready' && reports.length === 0 && 'まだ報告がありません'}
      </p>
    </main>
  );
}
