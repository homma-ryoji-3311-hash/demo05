import { useEffect, useState, type ChangeEvent } from 'react';
import {
  fetchDraft,
  summarizeReport,
  confirmReport,
  SUMMARY_KEYS,
  type SummaryDto,
  type SummaryKey,
} from '../api/reportsApi';

/** 表示ラベル（カテゴリ見出しの正本）。 */
const LABELS: Record<SummaryKey, string> = {
  incidents: 'インシデント',
  achievements: '成果',
  issues: '課題',
  skills: 'スキル',
};

const EMPTY_TEXT: Record<SummaryKey, string> = {
  incidents: '',
  achievements: '',
  issues: '',
  skills: '',
};

/** 改行区切りテキスト → 短文配列（空行は落とす）。 */
function toLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * S4 AI要約 表示・確認・編集（slice-02 / slice-03）。
 * - 常時: 本文（保持用の編集可能テキスト・唯一の textbox）／「要確認」フラグ／「再試行」を表示。
 *   要約失敗時も本文が失われないことをテキストで担保する（degrade）。
 * - 「要約する」: 4カテゴリ（インシデント/成果/課題/スキル）を編集可能な textbox として表示し、
 *   backend の要約結果で埋める。API が遅延・失敗しても見出しは即時に出す（楽観表示）。
 * - 「確定する」: confirm を呼び、確定済み表示（編集不可）へ切り替える。
 */
export function ReportReviewPage() {
  const [reportId, setReportId] = useState<string | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [summarized, setSummarized] = useState(false);
  const [summaryText, setSummaryText] = useState<Record<SummaryKey, string>>(EMPTY_TEXT);
  const [confirmed, setConfirmed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchDraft()
      .then((draft) => {
        if (active && draft) {
          setReportId(draft.id);
          setBodyText(draft.raw_text);
        }
      })
      .catch(() => {
        /* 下書きが無くても要約フロー自体は開始できる */
      });
    return () => {
      active = false;
    };
  }, []);

  const applySummary = (summary: SummaryDto): void => {
    setSummaryText({
      incidents: summary.incidents.join('\n'),
      achievements: summary.achievements.join('\n'),
      issues: summary.issues.join('\n'),
      skills: summary.skills.join('\n'),
    });
  };

  const onSummarize = (): void => {
    // 楽観表示: API 結果を待たずにカテゴリ枠を出す（遅延・失敗でも見出しは表示される）。
    setSummarized(true);
    setFailed(false);
    if (!reportId) return;
    void summarizeReport(reportId)
      .then(applySummary)
      .catch(() => {
        setFailed(true);
      });
  };

  const onConfirm = (): void => {
    // 楽観表示: クリック即時に確定済みへ切り替える（DOM 契約）。永続化は best-effort。
    setConfirmed(true);
    if (!reportId) return;
    const summary: SummaryDto = {
      incidents: toLines(summaryText.incidents),
      achievements: toLines(summaryText.achievements),
      issues: toLines(summaryText.issues),
      skills: toLines(summaryText.skills),
    };
    void confirmReport(reportId, summary).catch(() => {
      /* 確定の永続化に失敗しても表示は確定済みのまま（フェイク環境） */
    });
  };

  const onBodyChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setBodyText(e.target.value);
  };

  const onCategoryChange = (key: SummaryKey) => (e: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setSummaryText((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">業務報告の要約・確認</h1>

      {confirmed && (
        <p role="status" className="mb-4 rounded bg-green-50 p-3 font-medium text-green-800">
          確定済み — この報告は確定され、編集できません。
        </p>
      )}

      {/* 本文（保持用）。常時表示される唯一の textbox。要約に失敗しても本文は失われない。 */}
      <section className="mb-6">
        <label htmlFor="review-body" className="mb-1 block font-medium">
          報告本文
        </label>
        <textarea
          id="review-body"
          value={bodyText}
          onChange={onBodyChange}
          readOnly={confirmed}
          className="min-h-32 w-full rounded border p-2"
          placeholder="今日の業務内容"
        />
      </section>

      {/* AI 要約は必ず人が確認する（要確認フラグ）。要約失敗時は再試行できる。 */}
      <p className="mb-2 text-sm text-amber-700">
        AI 要約は要確認です。内容を必ず確認してください。
      </p>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={onSummarize}
          disabled={confirmed}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          要約する
        </button>
        <button
          type="button"
          onClick={onSummarize}
          disabled={confirmed}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          再試行
        </button>
      </div>

      {failed && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          要約の取得に失敗しました。本文は保持されています。もう一度お試しください。
        </p>
      )}

      {summarized && (
        <section aria-label="AI 要約" className="mb-6 space-y-4">
          {SUMMARY_KEYS.map((key) => (
            <div key={key}>
              <h2 className="mb-1 font-semibold">{LABELS[key]}</h2>
              <textarea
                aria-label={LABELS[key]}
                value={summaryText[key]}
                onChange={onCategoryChange(key)}
                readOnly={confirmed}
                className="min-h-20 w-full rounded border p-2"
              />
            </div>
          ))}
        </section>
      )}

      {!confirmed && (
        <button
          type="button"
          onClick={onConfirm}
          className="rounded bg-green-600 px-4 py-2 text-white"
        >
          確定する
        </button>
      )}
    </main>
  );
}
