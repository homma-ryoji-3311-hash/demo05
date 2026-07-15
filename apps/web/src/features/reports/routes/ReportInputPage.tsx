import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  fetchDraft,
  createDraft,
  updateDraft,
  fetchPrevious,
  SUMMARY_KEYS,
  type ReportDto,
  type PreviousDto,
} from '../api/reportsApi';

const PREVIOUS_LABELS: Record<(typeof SUMMARY_KEYS)[number], string> = {
  incidents: 'インシデント',
  achievements: '成果',
  issues: '課題',
  skills: 'スキル',
};

/**
 * S3 業務報告入力（slice-01）。
 * - マウント時に現在の下書きを復元する（再訪時に保存済み下書きが表示される）。
 * - 本文入力で明示操作なしに自動保存し、保存状態をテキストで示す（色だけに頼らない）。
 * - 保存に失敗しても入力内容は保持する（degrade）。
 */
export function ReportInputPage() {
  const [text, setText] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previous, setPrevious] = useState<PreviousDto['previous']>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void fetchDraft()
      .then((draft: ReportDto | null) => {
        if (active && draft) {
          setText(draft.raw_text);
          setReportId(draft.id);
          // 前回の確定報告を控えめに参照する（S3）。現在の下書きを基準に取得する。
          void fetchPrevious(draft.id)
            .then((res) => {
              if (active) setPrevious(res.previous);
            })
            .catch(() => {
              /* 前回参照の取得失敗は「なし」表示にフォールバック */
            });
        }
      })
      .catch(() => {
        /* 復元失敗は無視（空から開始できる） */
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

      {/* S3 前回参照。控えめな読み取り専用。入力欄（textbox）は置かない。 */}
      <section aria-label="前回の報告" className="mt-8 rounded border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">前回の報告</h2>
        {previous ? (
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <span className="block font-medium text-gray-500">本文</span>
              <p className="whitespace-pre-wrap">{previous.raw_text}</p>
            </div>
            <dl className="space-y-1">
              {SUMMARY_KEYS.map((key) => (
                <div key={key}>
                  <dt className="font-medium text-gray-500">{PREVIOUS_LABELS[key]}</dt>
                  <dd className="whitespace-pre-wrap">{previous.summary[key].join('、') || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="text-sm text-gray-500">前回の報告はありません</p>
        )}
      </section>
    </main>
  );
}
