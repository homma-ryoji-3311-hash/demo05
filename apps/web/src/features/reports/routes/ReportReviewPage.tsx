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
/** 下書きの読み込み状態。ready になるまで要約できない（要約対象が確定していないため）。 */
type DraftState = 'loading' | 'ready' | 'absent';

export function ReportReviewPage() {
  const [text, setText] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryDto | null>(null);
  const [state, setState] = useState<SummarizeState>('idle');
  const [draftState, setDraftState] = useState<DraftState>('loading');

  useEffect(() => {
    let active = true;
    void fetchDraft()
      .then((draft: ReportDto | null) => {
        if (!active) return;
        if (draft) {
          setText(draft.raw_text);
          setReportId(draft.id);
          setDraftState('ready');
        } else {
          setDraftState('absent');
        }
      })
      .catch(() => {
        if (active) setDraftState('absent');
      });
    return () => {
      active = false;
    };
  }, []);

  const onSummarize = (): void => {
    if (!reportId) return; // 読み込み前は押せない（ボタンが disabled）
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

      {/* 下書きを読み込むまで押せない。押せてしまうと、要約対象が未確定のまま失敗表示になる。 */}
      <button
        type="button"
        onClick={onSummarize}
        disabled={draftState !== 'ready' || state === 'loading'}
        className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        要約する
      </button>

      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
        {draftState === 'loading' && '下書きを読み込んでいます'}
        {draftState === 'absent' && '要約できる下書きがありません'}
        {draftState === 'ready' && state === 'loading' && '要約中です'}
        {draftState === 'ready' && state === 'failed' && '要約に失敗しました。本文は保持しています。再試行してください'}
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
