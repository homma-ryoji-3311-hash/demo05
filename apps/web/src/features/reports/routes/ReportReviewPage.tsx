import { useEffect, useState } from 'react';
import {
  answerFollowUp,
  confirmReport,
  fetchDraft,
  requestFollowUp,
  summarizeReport,
  updateDraft,
  type FollowUpDto,
  type ReportDto,
  type SummaryDto,
} from '../api/reportsApi';

/**
 * S4 AI要約 確認・編集（slice-02 の要約表示 ＋ slice-03 の編集・確定）。
 * - マウント時に現在の下書きを読み、本文を画面に保持する（要約が失敗しても消えない）。
 * - 「要約する」で抽象化層（backend の Summarizer）を呼び、4カテゴリの結果を編集可能なフォームに載せる。
 * - 元の入力と要約を左右に並べて照合できるようにする（spec.md §3.3）。
 * - 不足・不確実な箇所は「要確認」フラグとしてテキストで示す（色だけに頼らない・非機能要件）。
 * - 「確定」で編集後の要約を送り、以後は編集不可の確定表示へ切り替える。
 *
 * 要確認の判定を画面側のルール（空カテゴリ＝要確認）に置いているのは、参照モック（answer key）が
 * flags を持たず、backend に足すと HTTP 等価が崩れるため（リーダー判断・2026-07-16）。
 * 判定をドメインへ移すかは、要確認フラグの API 契約が仕様表に入った時点で再検討する。
 */
const CATEGORIES: ReadonlyArray<{ key: keyof SummaryDto; label: string }> = [
  { key: 'incidents', label: 'インシデント' },
  { key: 'achievements', label: '成果' },
  { key: 'issues', label: '課題' },
  { key: 'skills', label: 'スキル' },
];

const EMPTY_SUMMARY: SummaryDto = { incidents: [], achievements: [], issues: [], skills: [] };

type SummarizeState = 'idle' | 'loading' | 'failed';
/** 下書きの読み込み状態。ready になるまで要約・確定できない（対象が確定していないため）。 */
type DraftState = 'loading' | 'ready' | 'absent';
type ConfirmState = 'idle' | 'loading' | 'failed';

/** 要約1項目 = 1行。空行は項目にしない。 */
function toLines(items: string[]): string {
  return items.join('\n');
}
function fromLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** 中身が無いカテゴリの数を「要確認」件数として返す（不足の検出・spec.md §3.3）。 */
function countNeedsReview(summary: SummaryDto): number {
  return CATEGORIES.filter(({ key }) => summary[key].length === 0).length;
}

export function ReportReviewPage() {
  const [text, setText] = useState('');
  // 最後に永続化された本文。text と食い違っていれば未保存の編集がある。
  const [savedText, setSavedText] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  // null = まだ要約していない。要約前に編集欄を出さない（要約対象が無いフォームになるため）。
  const [summary, setSummary] = useState<SummaryDto | null>(null);
  const [state, setState] = useState<SummarizeState>('idle');
  const [draftState, setDraftState] = useState<DraftState>('loading');
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const [confirmed, setConfirmed] = useState(false);
  // slice-23: AI 追加質問（薄い項目へ一度きり）。必須未回答なら確定を無効化する。
  const [followUp, setFollowUp] = useState<FollowUpDto | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  useEffect(() => {
    let active = true;
    void fetchDraft()
      .then((draft: ReportDto | null) => {
        if (!active) return;
        if (draft) {
          setText(draft.raw_text);
          setSavedText(draft.raw_text);
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

  // slice-23: 下書きが読めたら追加質問を要求（一度きり・薄い項目のみ）。提示済みなら同一が返る。
  useEffect(() => {
    if (!reportId) return;
    let active = true;
    void requestFollowUp(reportId)
      .then((fu) => {
        if (active) setFollowUp(fu);
      })
      .catch(() => {
        /* degrade: 追加質問が取れなくても確認・確定フローは続けられる */
      });
    return () => {
      active = false;
    };
  }, [reportId]);

  const onAnswerFollowUp = (): void => {
    if (!reportId || followUpAnswer.trim() === '') return;
    void answerFollowUp(reportId, followUpAnswer)
      .then((res) => {
        setText(res.raw_text); // 回答は本文へ追記され、要約は作り直される
        setSavedText(res.raw_text);
        setFollowUp((prev) => (prev ? { ...prev, state: 'answered' } : prev));
        setFollowUpAnswer('');
      })
      .catch(() => {
        /* degrade: 回答保存に失敗しても入力は失わない */
      });
  };

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

  const onConfirm = (): void => {
    if (!reportId) return;
    setConfirmState('loading');
    // 本文が編集されていれば、確定の前に保存する。確定後は PATCH が 409 になるので（AC-2）、
    // ここで保存しないと編集は黙って捨てられ、しかも回復できない。
    const saveBody: Promise<unknown> = text === savedText ? Promise.resolve() : updateDraft(reportId, text);
    void saveBody
      .then(() => confirmReport(reportId, summary ?? EMPTY_SUMMARY))
      .then((report) => {
        setSavedText(text);
        setConfirmed(report.status === 'confirmed');
        setConfirmState('idle');
      })
      .catch(() => {
        // 本文の保存に失敗した場合はここで止まる＝未保存のまま確定しない。
        // 409（二重確定・確定後の変更）も同じ経路。編集内容は state に残す。
        setConfirmState('failed');
      });
  };

  // 要約前は全カテゴリが空＝すべて要確認。件数だけを出すのは、カテゴリ名を再掲すると
  // 各カテゴリのラベルと二重になり、受け入れテストの一意指定（strict mode）が壊れるため。
  const reviewCount = countNeedsReview(summary ?? EMPTY_SUMMARY);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">AI要約の確認・編集</h1>

      {confirmed && <p className="mb-4 rounded bg-gray-100 p-2 font-medium">確定済み — この報告は編集できません</p>}

      {/* 元の入力と要約を左右に並べて照合できるようにする（spec.md §3.3）。 */}
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <label htmlFor="review-body" className="mb-1 block font-medium">
            報告本文（元の入力）
          </label>
          <textarea
            id="review-body"
            value={text}
            readOnly={confirmed}
            onChange={(e) => setText(e.target.value)}
            className="min-h-32 w-full rounded border p-2 read-only:bg-gray-50"
          />
        </section>

        <section>
          {summary === null ? (
            <p className="text-sm text-gray-600">「要約する」を押すと、ここに編集できる要約が表示されます</p>
          ) : (
            CATEGORIES.map(({ key, label }) => (
              <div key={key} className="mb-3">
                <label htmlFor={`summary-${key}`} className="mb-1 block text-sm font-medium">
                  {label}
                </label>
                <textarea
                  id={`summary-${key}`}
                  value={toLines(summary[key])}
                  readOnly={confirmed}
                  onChange={(e) => setSummary({ ...summary, [key]: fromLines(e.target.value) })}
                  className="min-h-16 w-full rounded border p-2 read-only:bg-gray-50"
                  placeholder="1行につき1項目"
                />
              </div>
            ))
          )}
        </section>
      </div>

      {!confirmed && reviewCount > 0 && (
        <p className="mt-4 text-sm">要確認: {reviewCount}件のカテゴリが未記入です。内容を確認してください</p>
      )}

      {/* slice-23: AI 追加質問（薄い項目へ一度きり）。確認画面に提示し、その場で回答できる。 */}
      {!confirmed && followUp?.state === 'asked' && (
        <section aria-label="追加質問" className="mt-4 rounded border bg-blue-50 p-3">
          <h2 className="mb-1 font-medium">AI 追加質問</h2>
          <p className="mb-2 text-sm">{followUp.question ?? 'より具体的な内容を教えてください。'}</p>
          <textarea
            aria-label="追加質問への回答"
            value={followUpAnswer}
            onChange={(e) => setFollowUpAnswer(e.target.value)}
            className="mb-2 w-full rounded border p-2"
            placeholder="ここに回答を入力してください"
          />
          <button type="button" onClick={onAnswerFollowUp} className="rounded border px-3 py-1">
            回答を送信
          </button>
          <p className="mt-2 text-sm text-gray-700">
            {followUp.required
              ? '必須の追加質問です。回答してください（未回答のままでは確定できません）。'
              : '任意の追加質問です。回答してください（未回答でも確定できます）。'}
          </p>
        </section>
      )}

      {!confirmed && (
        <div className="mt-4 flex gap-3">
          {/* 下書きを読み込むまで押せない。押せてしまうと、対象が未確定のまま失敗表示になる。 */}
          <button
            type="button"
            onClick={onSummarize}
            disabled={draftState !== 'ready' || state === 'loading'}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            要約する
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={
              draftState !== 'ready' ||
              confirmState === 'loading' ||
              (followUp?.state === 'asked' && followUp.required === true) // 必須未回答は確定を無効化（slice-23）
            }
            className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
          >
            確定
          </button>
        </div>
      )}

      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
        {draftState === 'loading' && '下書きを読み込んでいます'}
        {draftState === 'absent' && '確定できる下書きがありません'}
        {draftState === 'ready' && state === 'loading' && '要約中です'}
        {draftState === 'ready' && state === 'failed' && '要約に失敗しました。本文は保持しています。再試行してください'}
        {draftState === 'ready' && confirmState === 'loading' && '確定しています'}
        {draftState === 'ready' && confirmState === 'failed' && '確定できませんでした。再試行してください'}
      </p>
    </main>
  );
}
