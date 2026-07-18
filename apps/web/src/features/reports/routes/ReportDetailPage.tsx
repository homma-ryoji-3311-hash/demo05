import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchReport, type ReportDto, type SummaryDto } from '../api/reportsApi';

/**
 * S5 業務報告詳細（slice-04 AC-2 の画面側）。
 * - 本文と確定要約を表示する。
 * - 他人の報告は backend が 403 にする＝ここでは取得失敗として見せ、内容は一切出さない（AC-3）。
 */
const CATEGORIES: ReadonlyArray<{ key: keyof SummaryDto; label: string }> = [
  { key: 'incidents', label: 'インシデント' },
  { key: 'achievements', label: '成果' },
  { key: 'issues', label: '課題' },
  { key: 'skills', label: 'スキル' },
];

type LoadState = 'loading' | 'ready' | 'failed';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportDto | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    if (!id) return;
    let active = true;
    void fetchReport(id)
      .then((r) => {
        if (!active) return;
        setReport(r);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, [id]);

  const summary = report?.confirmed_summary ?? null;

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">業務報告の詳細</h1>

      {state === 'ready' && report && (
        <>
          <p className="mb-4 text-sm text-gray-600">{report.report_date}</p>

          <h2 className="mb-1 font-medium">報告本文</h2>
          <p className="mb-6 whitespace-pre-wrap rounded border bg-gray-50 p-2">{report.raw_text}</p>

          <h2 className="mb-1 font-medium">確定要約</h2>
          {summary === null ? (
            <p className="text-sm text-gray-600">この報告はまだ確定していません</p>
          ) : (
            CATEGORIES.map(({ key, label }) => (
              <div key={key} className="mb-3">
                <h3 className="text-sm font-medium">{label}</h3>
                <ul className="list-disc pl-6">
                  {summary[key].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </>
      )}

      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
        {state === 'loading' && '読み込んでいます'}
        {state === 'failed' && 'この報告は表示できません'}
      </p>
    </main>
  );
}
