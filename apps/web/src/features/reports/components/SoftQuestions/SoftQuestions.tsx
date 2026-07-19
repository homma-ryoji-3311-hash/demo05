import { useState } from 'react';
import { saveSoftAnswers } from '../../api/reportsApi';

/**
 * S3 ソフト設問（slice-20）。AI活用・課題・所感・雑感（メンタル面）を任意入力。
 * - 雑感は「本人のみ非公開」に設定可（zakkan_visibility=private）。閲覧は最小ロールに限定（backend が強制）。
 * - スコア・点数・診断の UI は持たない（監視ダッシュボードにしない・AC-4）。雑感は共有ビュー・要約に出さない（backend）。
 */
export function SoftQuestions({ reportId }: { reportId: string | null }) {
  const [aiUse, setAiUse] = useState('');
  const [issue, setIssue] = useState('');
  const [shokan, setShokan] = useState('');
  const [zakkan, setZakkan] = useState('');
  const [zakkanPrivate, setZakkanPrivate] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!reportId) return;
    setSaved(false);
    void saveSoftAnswers(reportId, {
      ai_use: aiUse,
      issue,
      shokan,
      zakkan,
      zakkan_visibility: zakkanPrivate ? 'private' : 'limited',
    })
      .then(() => setSaved(true))
      .catch(() => {
        /* degrade: 保存失敗でも入力は失わない */
      });
  };

  return (
    <section aria-label="ソフト設問" className="mt-6 rounded border p-3">
      <h2 className="mb-2 font-medium">ソフト設問（任意）</h2>
      <label className="mb-2 block">
        AI活用（AIを業務にどう使ったか）
        <input aria-label="AI活用" value={aiUse} onChange={(e) => setAiUse(e.target.value)} className="ml-2 border" />
      </label>
      <label className="mb-2 block">
        課題
        <input aria-label="課題" value={issue} onChange={(e) => setIssue(e.target.value)} className="ml-2 border" />
      </label>
      <label className="mb-2 block">
        所感
        <input aria-label="所感" value={shokan} onChange={(e) => setShokan(e.target.value)} className="ml-2 border" />
      </label>
      <label className="mb-2 block">
        雑感（メンタル面・任意・閲覧限定）
        <input aria-label="雑感" value={zakkan} onChange={(e) => setZakkan(e.target.value)} className="ml-2 border" />
      </label>
      <label className="mb-2 block">
        <input type="checkbox" checked={zakkanPrivate} onChange={(e) => setZakkanPrivate(e.target.checked)} />
        <span className="ml-1">雑感を本人のみ非公開にする</span>
      </label>
      <button type="button" onClick={save} disabled={!reportId} className="rounded border px-3 py-1">
        ソフト設問を保存
      </button>
      {saved && (
        <span role="status" aria-live="polite" className="ml-2 text-sm text-gray-600">
          保存しました
        </span>
      )}
    </section>
  );
}
