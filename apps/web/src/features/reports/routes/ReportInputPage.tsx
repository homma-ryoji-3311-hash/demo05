import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  fetchDraft,
  createDraft,
  updateDraft,
  fetchPrevious,
  type ReportDto,
  type PreviousReportDto,
  type SummaryDto,
} from '../api/reportsApi';

/** 前回要約の表示順とラベル（ReportReviewPage の CATEGORIES と同じ語彙に揃える）。 */
const SUMMARY_CATEGORIES: ReadonlyArray<{ key: keyof SummaryDto; label: string }> = [
  { key: 'incidents', label: 'インシデント' },
  { key: 'achievements', label: '成果' },
  { key: 'issues', label: '課題' },
  { key: 'skills', label: 'スキル' },
];

/**
 * S3 業務報告入力（slice-01）。
 * - マウント時に現在の下書きを復元する（再訪時に保存済み下書きが表示される）。
 * - 本文入力で明示操作なしに自動保存し、保存状態をテキストで示す（色だけに頼らない・非機能要件）。
 * - 保存に失敗しても入力内容は保持する（degrade）。
 * - 前回の確定報告を読み取り専用で参照する（slice-05）。
 * 要約（slice-02）・確定（slice-03）は後続スライスで足す。
 */
export function ReportInputPage() {
  const [text, setText] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previous, setPrevious] = useState<PreviousReportDto | null>(null);
  // 前回参照の取得が済むまで「ありません」を出さないための状態。取得前に「ありません」を
  // 描画すると、前回が在るユーザーに一瞬だけ事実と異なる表示が出る（丸写し抑制以前の問題）。
  const [previousLoaded, setPreviousLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void fetchDraft()
      .then((draft: ReportDto | null) => {
        if (!active || !draft) return null;
        setText(draft.raw_text);
        setReportId(draft.id);
        // 前回参照は下書きの id を起点に引く（GET /reports/:id/previous）。
        // 下書きがまだ無ければ起点が無い＝前回なし扱い（参照領域は「ありません」を出す）。
        return fetchPrevious(draft.id);
      })
      .then((prev) => {
        if (!active) return;
        setPrevious(prev);
        setPreviousLoaded(true);
      })
      .catch(() => {
        /* 復元・前回参照の失敗は無視（空から開始できる・前回は「ありません」表示に倒す） */
        if (active) setPreviousLoaded(true);
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
      {/*
        前回参照（slice-05）。控えめな読み取り専用表示＝丸写しを誘発しない（spec.md §3.2）ため、
        入力欄より小さい字・淡い配色で本文の前に置き、入力要素は一切持たせない。
      */}
      <section
        aria-labelledby="previous-heading"
        className="mb-6 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600"
      >
        <h2 id="previous-heading" className="mb-1 font-medium">
          前回の報告
        </h2>
        {!previousLoaded ? (
          <p>読み込み中…</p>
        ) : previous ? (
          <>
            <p className="whitespace-pre-wrap">{previous.raw_text}</p>
            {previous.summary && (
              <dl className="mt-2 space-y-0.5">
                {SUMMARY_CATEGORIES.filter(({ key }) => previous.summary?.[key].length).map(({ key, label }) => (
                  <div key={key} className="flex gap-2">
                    <dt className="shrink-0">{label}:</dt>
                    <dd>{previous.summary?.[key].join('、')}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        ) : (
          <p>前回の報告はありません</p>
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
