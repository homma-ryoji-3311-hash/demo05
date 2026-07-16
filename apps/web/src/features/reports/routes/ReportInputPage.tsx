import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { fetchDraft, createDraft, updateDraft, type ReportDto } from '../api/reportsApi';

/**
 * S3 業務報告入力（slice-01）。
 * - マウント時に現在の下書きを復元する（再訪時に保存済み下書きが表示される）。
 * - 本文入力で明示操作なしに自動保存し、保存状態をテキストで示す（色だけに頼らない・非機能要件）。
 * - 保存に失敗しても入力内容は保持する（degrade）。
 * 前回参照（S3・slice-05）・要約（slice-02）・確定（slice-03）は後続スライスで足す。
 */
export function ReportInputPage() {
  const [text, setText] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    </main>
  );
}
