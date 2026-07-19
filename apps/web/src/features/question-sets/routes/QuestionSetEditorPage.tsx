import { useState } from 'react';
import { createQuestionSet, publishQuestionSet } from '../api/questionSetsApi';

/**
 * S10 設問テンプレート編集（slice-19・manager）。
 * - 設問の追加・削除・並べ替え（配列順＝並び順）。各設問で回答形式・必須/任意・役割タグを選ぶ。
 * - 公開はガードレール（必須役割 project_key・skill）を実行し、不足役割をテキストで明示して公開を拒否する。
 * - 状態（下書き/公開済み）をテキストで示す（色のみに依存しない）。
 */
const FORMAT_OPTIONS = [
  { value: 'short', label: '短文' },
  { value: 'long', label: '長文' },
  { value: 'select', label: '選択' },
];
const ROLE_OPTIONS = [
  { value: 'project_key', label: '案件キー紐づけ' },
  { value: 'status', label: 'ステータス' },
  { value: 'skill', label: 'スキル抽出' },
  { value: 'internal_only', label: '内部のみ' },
];

interface Row {
  format: string;
  required: boolean;
  role_tag: string;
  text: string;
}
const newRow = (): Row => ({ format: 'short', required: false, role_tag: 'project_key', text: '' });

export function QuestionSetEditorPage() {
  const [groupId, setGroupId] = useState('grp_engineer');
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [missing, setMissing] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const addRow = () => setRows((r) => [...r, newRow()]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, j) => j !== i));
  const patch = (i: number, p: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...p } : row)));
  const move = (i: number, dir: -1 | 1) =>
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      const a = copy[i];
      const b = copy[j];
      if (!a || !b) return r;
      copy[i] = b;
      copy[j] = a;
      return copy;
    });

  const publish = () => {
    setMissing(null);
    setMessage(null);
    void createQuestionSet({ group_id: groupId, questions: rows })
      .then((qs) => publishQuestionSet(qs.id))
      .then((res) => {
        if ('missing_roles' in res) {
          setMissing(res.missing_roles);
          setStatus('draft');
        } else {
          setStatus('published');
          setMessage('公開しました');
        }
      })
      .catch(() => setMessage('公開できませんでした。権限や入力を確認してください'));
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">設問テンプレート編集</h1>

      <p className="mb-3">
        状態: <span className="font-medium">{status === 'published' ? '公開済み' : '下書き'}</span>
      </p>

      <label className="mb-3 block">
        グループ
        <input value={groupId} onChange={(e) => setGroupId(e.target.value)} className="ml-2 border" aria-label="グループ" />
      </label>

      <ol className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="rounded border p-3">
            <span className="mr-1 text-sm font-medium">回答形式</span>
            <select
              aria-label="回答形式"
              value={row.format}
              onChange={(e) => patch(i, { format: e.target.value })}
              className="mr-3 border"
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="mr-3">
              <input type="checkbox" checked={row.required} onChange={(e) => patch(i, { required: e.target.checked })} />
              <span className="ml-1 text-sm">必須（未チェックは任意）</span>
            </label>
            <span className="mr-1 text-sm font-medium">役割タグ</span>
            <select
              aria-label="役割タグ"
              value={row.role_tag}
              onChange={(e) => patch(i, { role_tag: e.target.value })}
              className="mr-3 border"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              aria-label="設問文"
              value={row.text}
              onChange={(e) => patch(i, { text: e.target.value })}
              placeholder="設問文"
              className="border"
            />
            <button type="button" onClick={() => move(i, -1)} className="ml-2 rounded border px-2">
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} className="ml-1 rounded border px-2">
              ↓
            </button>
            <button type="button" onClick={() => removeRow(i)} className="ml-1 rounded border px-2">
              削除
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={addRow} className="rounded border px-3 py-1">
          設問を追加
        </button>
        <button type="button" onClick={publish} className="rounded border px-3 py-1">
          公開
        </button>
      </div>

      {missing && (
        <p role="alert" className="mt-3 text-red-700">
          公開できません。不足している必須役割: {missing.join('、')}
        </p>
      )}
      {message && (
        <p role="status" aria-live="polite" className="mt-3">
          {message}
        </p>
      )}
    </main>
  );
}
