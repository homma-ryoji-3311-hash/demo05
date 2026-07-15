import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchReport, SUMMARY_KEYS, type ReportDto, type SummaryKey } from '../api/reportsApi';

const LABELS: Record<SummaryKey, string> = {
  incidents: 'インシデント',
  achievements: '成果',
  issues: '課題',
  skills: 'スキル',
};

function statusLabel(status: string): string {
  return status === 'confirmed' ? '確定' : '下書き';
}

/**
 * S5 業務報告 詳細（slice-04）。
 * - 本文と（確定していれば）確定要約を読み取り専用で表示する。
 * - 見出しは「本文と要約」の 1 要素に集約する。本文・要約の中身は readonly textarea に入れ、
 *   その value がテキスト検索に一致しないようにする
 *   （Playwright strict-mode: 本文中の「本文」等が getByText(/本文|要約/) と多重一致するのを避けるため）。
 */
export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportDto | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void fetchReport(id)
      .then((r) => {
        if (active) setReport(r);
      })
      .catch(() => {
        /* 取得失敗（403/404 等）は詳細なしで表示 */
      });
    return () => {
      active = false;
    };
  }, [id]);

  const summary = report?.confirmed_summary ?? null;

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">報告詳細</h1>
      {report && (
        <p className="mb-4 text-sm text-gray-600">
          {report.report_date}・{statusLabel(report.status)}
        </p>
      )}

      <h2 className="mb-2 text-lg font-semibold">本文と要約</h2>

      <section className="mb-6">
        <textarea
          aria-label="報告の本文"
          readOnly
          value={report?.raw_text ?? ''}
          className="min-h-32 w-full rounded border bg-gray-50 p-2"
        />
      </section>

      {summary ? (
        <section className="space-y-4">
          {SUMMARY_KEYS.map((key) => (
            <div key={key}>
              <span className="mb-1 block font-medium">{LABELS[key]}</span>
              <textarea
                aria-label={LABELS[key]}
                readOnly
                value={summary[key].join('\n')}
                className="min-h-16 w-full rounded border bg-gray-50 p-2"
              />
            </div>
          ))}
        </section>
      ) : (
        <p className="text-sm text-gray-500">（未確定）</p>
      )}
    </main>
  );
}
