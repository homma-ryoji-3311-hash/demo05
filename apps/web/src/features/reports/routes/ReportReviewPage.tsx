import { useEffect, useState } from 'react';
import { fetchDraft, summarizeReport, type ReportDto, type SummaryDto } from '../api/reportsApi';

/**
 * S4 AI要約 確認（slice-02 の要約結果表示部）。
 * - マウント時に現在の下書きを読み、本文を画面に保持する（要約が失敗しても消えない）。
 * - 「要約する」で抽象化層（backend の Summarizer）を呼び、4カテゴリの結果を表示する。
 * - 要約中・失敗の状態はテキストで示す（色だけに頼らない・非機能要件）。
 * 本文の編集・確定は slice-03 の領分なので、ここでは本文を読み取り専用で見せるだけ。
 */
const CATEGORIES: ReadonlyArray<{ key: keyof SummaryDto; label: string }> = [
  { key: 'incidents', label: 'インシデント' },
  { key: 'achievements', label: '成果' },
  { key: 'issues', label: '課題' },
  { key: 'skills', label: 'スキル' },
];

type SummarizeState = 'idle' | 'loading' | 'failed';

export function ReportReviewPage() {
  const [text, setText] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryDto | null>(null);
  const [state, setState] = useState<SummarizeState>('idle');

  useEffect(() => {
    let active = true;
    void fetchDraft()
      .then((draft: ReportDto | null) => {
        if (active && draft) {
          setText(draft.raw_text);
          setReportId(draft.id);
        }
      })
      .catch(() => {
        /* 復元失敗は無視（要約対象が無いだけ。本文は空のまま） */
      });
    return () => {
      active = false;
    };
  }, []);

  const onSummarize = (): void => {
    if (!reportId) {
      setState('failed');
      return;
    }
    setState('loading');
    void summarizeReport(reportId)
      .then((result) => {
        setSummary(result);
        setState('idle');
      })
      .catch(() => {
        // degrade: 要約に失敗しても本文（text）は state に残る＝画面から消えない。
        setState('failed');
      });
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">AI要約の確認</h1>

      <label htmlFor="review-body" className="mb-1 block font-medium">
        報告本文
      </label>
      <textarea id="review-body" value={text} readOnly className="min-h-32 w-full rounded border bg-gray-50 p-2" />

      <button
        type="button"
        onClick={onSummarize}
        disabled={state === 'loading'}
        className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        要約する
      </button>

      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
        {state === 'loading' && '要約中です'}
        {state === 'failed' && '要約に失敗しました。本文は保持しています。再試行してください'}
      </p>

      {summary && (
        <section className="mt-6">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key} className="mb-4">
              <h2 className="font-bold">{label}</h2>
              <ul className="list-disc pl-6">
                {summary[key].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
