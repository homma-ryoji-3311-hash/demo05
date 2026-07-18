import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { fetchDraft, createDraft, updateDraft, fetchPrevious, fetchReports, type ReportDto, type SummaryDto } from '../api/reportsApi';

/** 前回参照の表示データ（前回本文＋前回確定要約）。無ければ null。 */
type Previous = { raw_text: string; summary: SummaryDto | null } | null;

/**
 * S3 業務報告入力（slice-01）＋前回参照（slice-05）。
 * - マウント時に現在の下書きを復元する（再訪時に保存済み下書きが表示される）。
 * - 本文入力で明示操作なしに自動保存し、保存状態をテキストで示す（色だけに頼らない・非機能要件）。
 * - 保存に失敗しても入力内容は保持する（degrade）。
 * - 前回参照（slice-05）: 直近の確定報告の本文・要約を控えめな読み取り専用で示す（丸写しを誘発しない）。
 *   下書きがあれば `GET /reports/:id/previous` を使う。下書きが無いユーザーは一覧から直近確定を導く
 *   （＝入力の自動保存フローに割り込まない＝空の下書きを勝手に作らない）。
 */
export function ReportInputPage() {
  const [text, setText] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // undefined = 読み込み中 / null = 前回なし / 値 = 前回あり
  const [previous, setPrevious] = useState<Previous | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void fetchDraft()
      .then(async (draft: ReportDto | null) => {
        if (active && draft) {
          setText(draft.raw_text);
          setReportId(draft.id);
        }
        // 前回参照: 下書きがあれば /previous（対象 id を除いた直近確定）。無ければ一覧から直近確定を導く。
        if (draft) {
          const prev = await fetchPrevious(draft.id);
          if (active) setPrevious(prev);
        } else {
          const reports = await fetchReports();
          const prev = reports.find((r) => r.status === 'confirmed');
          if (active) setPrevious(prev ? { raw_text: prev.raw_text, summary: prev.confirmed_summary ?? null } : null);
        }
      })
      .catch(() => {
        if (active) setPrevious(null); // 取得失敗は「前回なし」表示にフォールバック
      });
    return () => {
      active = false;
    };
  }, []);

  const scheduleSave = (value: string): void => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const request = reportId ? updateDraft(reportId, value) : createDraft(value);
      void request
        .then((persisted) => {
          setReportId(persisted.id);
          setSaved(true);
        })
        .catch(() => {
          /* degrade: 失敗しても入力は失わない */
        });
    }, 300);
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setText(value);
    setSaved(false);
    scheduleSave(value);
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">業務報告入力</h1>

      {/* 前回参照（slice-05）。読み取り専用＝入力欄を置かない。region の名前で ui.spec が特定する。 */}
      <section aria-label="前回の報告" className="mb-6 rounded border bg-gray-50 p-3 text-sm text-gray-700">
        <h2 className="mb-1 font-medium">前回の参照</h2>
        {previous === undefined ? (
          <p aria-live="polite">読み込んでいます</p>
        ) : previous === null ? (
          <p>前回の報告はありません</p>
        ) : (
          <div>
            <p className="whitespace-pre-wrap">{previous.raw_text}</p>
            {previous.summary && <PreviousSummary summary={previous.summary} />}
          </div>
        )}
      </section>

      <label htmlFor="report-body" className="mb-1 block font-medium">
        報告本文
      </label>
      <textarea
        id="report-body"
        value={text}
        onChange={onChange}
        className="min-h-40 w-full rounded border p-2"
        placeholder="今日の業務内容を入力してください"
      />
      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
        {saved ? '下書きを保存しました' : '自動保存が有効です'}
      </p>
    </main>
  );
}

/** 前回確定要約の控えめな読み取り専用表示（非空カテゴリのみ）。 */
const SUMMARY_LABEL = {
  incidents: 'インシデント',
  achievements: '成果',
  issues: '課題',
  skills: 'スキル',
} as const;

function PreviousSummary({ summary }: { summary: SummaryDto }) {
  const keys = Object.keys(SUMMARY_LABEL) as (keyof typeof SUMMARY_LABEL)[];
  return (
    <dl className="mt-2 space-y-1">
      {keys
        .filter((k) => summary[k].length > 0)
        .map((k) => (
          <div key={k} className="flex gap-2">
            <dt className="font-medium">{SUMMARY_LABEL[k]}</dt>
            <dd>{summary[k].join('、')}</dd>
          </div>
        ))}
    </dl>
  );
}
