import { useEffect, useState } from 'react';
import { fetchAdminStaff, type AdminStaffDto, type ReportStatus } from '../api/adminApi';

/**
 * S8 管理者コンソール/スタッフ一覧（slice-14）。
 * - 担当グループをタブとして並べ、選択したグループで絞り込む（未選択は担当グループ全員）。
 * - スタッフを表形式で 氏名・客先・最終報告・報告状況・最新シート・操作 の列とともに表示する。
 * - 報告状況は **色だけでなくテキスト**（報告済み／未報告）で示す（§3.9 の二値。5 ステータスは slice-15）。
 * - 各行操作の実挙動（プレビュー・DL・再生成・全員分生成）は slice-09・21。本スライスは列としての参照のみ。
 */
const STATUS_TEXT: Record<ReportStatus, string> = {
  reported: '報告済み',
  not_reported: '未報告',
};

type LoadState = 'loading' | 'ready' | 'failed';

export function AdminConsolePage() {
  const [data, setData] = useState<AdminStaffDto | null>(null);
  const [group, setGroup] = useState<string | null>(null); // null=担当グループ全員
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    void fetchAdminStaff(group ?? undefined)
      .then((d) => {
        if (!active) return;
        setData(d);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, [group]);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">管理者コンソール</h1>

      {state === 'loading' && (
        <p role="status" aria-live="polite">
          読み込んでいます
        </p>
      )}
      {state === 'failed' && <p role="alert">スタッフ一覧を取得できませんでした。再試行してください</p>}

      {data && (
        <>
          {/* 担当グループのタブ（担当外グループは現れない）。 */}
          <div role="tablist" aria-label="担当グループ" className="mb-4 flex gap-2">
            {data.groups.map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                onClick={() => setGroup(group === g ? null : g)}
                className={`rounded border px-3 py-1 ${group === g ? 'bg-blue-100 font-bold' : ''}`}
              >
                {g}
              </button>
            ))}
          </div>

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th scope="col" className="p-2">
                  氏名
                </th>
                <th scope="col" className="p-2">
                  客先
                </th>
                <th scope="col" className="p-2">
                  最終報告
                </th>
                <th scope="col" className="p-2">
                  報告状況
                </th>
                <th scope="col" className="p-2">
                  最新スキルシート
                </th>
                <th scope="col" className="p-2">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">{s.client_name}</td>
                  <td className="p-2">{s.last_report_at ?? '—'}</td>
                  <td className="p-2">{STATUS_TEXT[s.report_status]}</td>
                  <td className="p-2">{s.has_latest_sheet ? 'あり' : '未生成'}</td>
                  <td className="p-2">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
