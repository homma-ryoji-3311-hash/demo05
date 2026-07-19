import { useState } from 'react';
import { apiFetch } from '@/common/api/client';

interface BulkEntry {
  staff_id: string;
  filename: string;
}
interface BulkResult {
  entries: BulkEntry[];
  skipped: { staff_id: string }[];
  manifest: { generated: number; skipped: number; skipped_staff: string[] };
}

/**
 * S11 スキルシート一括ダウンロード（slice-21・manager）。
 * - 客先/部署/グループで対象を絞り込み、全員分を生成して ZIP（entries＋除外者 manifest）を得る。
 * - 対象件数・未生成の有無をテキストで示す（色のみに頼らない）。未生成スタッフは manifest に列挙。
 * - manager 限定は backend が強制（staff は 403）。
 */
export function BulkDownloadPage() {
  const [client, setClient] = useState('');
  const [dept, setDept] = useState('');
  const [group, setGroup] = useState('');
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    setError(null);
    const body: Record<string, string> = {};
    if (client) body.client = client;
    if (dept) body.dept = dept;
    if (group) body.group = group;
    void apiFetch<BulkResult>('/admin/skill-sheets/bulk', { method: 'POST', body: JSON.stringify(body) })
      .then(setResult)
      .catch(() => setError('一括生成に失敗しました。権限を確認してください'));
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">スキルシート一括ダウンロード</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <label>
          客先
          <input aria-label="客先" value={client} onChange={(e) => setClient(e.target.value)} className="ml-1 border" />
        </label>
        <label>
          部署
          <input aria-label="部署" value={dept} onChange={(e) => setDept(e.target.value)} className="ml-1 border" />
        </label>
        <label>
          グループ
          <input aria-label="グループ" value={group} onChange={(e) => setGroup(e.target.value)} className="ml-1 border" />
        </label>
      </div>

      <button type="button" onClick={generate} className="rounded border px-3 py-1">
        全員分を生成
      </button>

      {error && (
        <p role="alert" className="mt-2 text-red-700">
          {error}
        </p>
      )}

      <p className="mt-4">
        対象: {result?.manifest.generated ?? 0} 件（未生成: {result?.manifest.skipped ?? 0} 件）
      </p>

      {result && result.entries.length > 0 && (
        <>
          <ul className="mt-2">
            {result.entries.map((e) => (
              <li key={e.staff_id}>{e.filename}（ZIP に含む）</li>
            ))}
          </ul>
          <a href="#zip" download className="mt-2 inline-block rounded border px-3 py-1">
            ZIP をダウンロード
          </a>
        </>
      )}

      {result && result.manifest.skipped_staff.length > 0 && (
        <p className="mt-2 text-sm text-gray-700">
          未生成でスキップ: {result.manifest.skipped_staff.join('、')}
        </p>
      )}
    </main>
  );
}
