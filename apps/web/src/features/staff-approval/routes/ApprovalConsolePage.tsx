import { useEffect, useState } from 'react';
import { approveStaff, fetchPendingStaff, type StaffAccountRow } from '../api/staffApprovalApi';

/**
 * S12 承認・担当紐付けコンソール（slice-17・super admin）。
 * - 承認待ちスタッフを表で並べ、各行から 担当（主/副）・チャネル・報告サイクル を指定して承認する（AC-2）。
 * - 承認待ち一覧は super admin のみ取得できる（backend が 403・AC-4）。承認で status=active になり deny 解除（AC-3）。
 * - 主/副の「操作差」は解釈しない——属性として保存するだけ（slice-24）。
 */
const ASSIGNMENT_OPTIONS = [
  { value: 'primary', label: '主担当' },
  { value: 'secondary', label: '副担当' },
];
const CYCLE_OPTIONS = [
  { value: 'daily', label: '日報' },
  { value: 'weekly', label: '週報' },
  { value: 'biweekly', label: '隔週' },
  { value: 'monthly', label: '月報' },
];

type LoadState = 'loading' | 'ready' | 'failed';

function ApprovalRow({ row, onApproved }: { row: StaffAccountRow; onApproved: () => void }) {
  const [role, setRole] = useState('primary');
  const [channel, setChannel] = useState('');
  const [cycle, setCycle] = useState('daily');
  const [busy, setBusy] = useState(false);

  const approve = () => {
    setBusy(true);
    void approveStaff(row.id, { assignment: { role }, channel: channel || undefined, cycle })
      .then(onApproved)
      .catch(() => setBusy(false));
  };

  return (
    <tr className="border-b">
      <td className="p-2">{row.id}</td>
      <td className="p-2">
        <label>
          担当（主/副）
          <select aria-label="担当" value={role} onChange={(e) => setRole(e.target.value)} className="ml-1 border">
            {ASSIGNMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td className="p-2">
        <label>
          チャネル
          <input
            aria-label="チャネル"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="ml-1 border"
          />
        </label>
      </td>
      <td className="p-2">
        <label>
          報告サイクル
          <select aria-label="報告サイクル" value={cycle} onChange={(e) => setCycle(e.target.value)} className="ml-1 border">
            {CYCLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td className="p-2">
        <button type="button" onClick={approve} disabled={busy} className="rounded border px-3 py-1">
          承認
        </button>
      </td>
    </tr>
  );
}

export function ApprovalConsolePage() {
  const [rows, setRows] = useState<StaffAccountRow[] | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  const load = () => {
    setState('loading');
    void fetchPendingStaff()
      .then((d) => {
        setRows(d.pending);
        setState('ready');
      })
      .catch(() => setState('failed'));
  };

  useEffect(load, []);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">承認待ちスタッフ</h1>

      {state === 'loading' && (
        <p role="status" aria-live="polite">
          読み込んでいます
        </p>
      )}
      {state === 'failed' && <p role="alert">承認待ち一覧を取得できませんでした。再試行してください</p>}

      {rows && (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th scope="col" className="p-2">
                スタッフ
              </th>
              <th scope="col" className="p-2">
                担当（主/副）
              </th>
              <th scope="col" className="p-2">
                チャネル
              </th>
              <th scope="col" className="p-2">
                報告サイクル
              </th>
              <th scope="col" className="p-2">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <ApprovalRow key={r.id} row={r} onApproved={load} />
            ))}
          </tbody>
        </table>
      )}
      {rows && rows.length === 0 && <p>承認待ちのスタッフはいません</p>}
    </main>
  );
}
