import { useState } from 'react';
import { apiFetch } from '@/common/api/client';

interface GroupSettingDto {
  group_id: string;
  question_set_version: string | null;
  template_style: string | null;
  tab_label: string | null;
  effective_from: string | null;
}

/**
 * S8 グループ設定領域（slice-22・担当 manager）。専用画面は新設せず管理者コンソール内の設定領域として置く。
 * - グループを選び、グループ固有部分（設問セット版・シート様式・タブ表示）を設定データで編集する（設定駆動）。
 * - 変更は翌日以降の報告に適用（確定済み過去報告は不変）。編集は担当 manager のみ（backend が 403 で強制）。
 */
export function GroupSettingsPage() {
  const [groupId, setGroupId] = useState('grp_a');
  const [version, setVersion] = useState('');
  const [style, setStyle] = useState('');
  const [tab, setTab] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setMessage(null);
    void apiFetch<GroupSettingDto>(`/groups/${encodeURIComponent(groupId)}/settings`)
      .then((s) => {
        setVersion(s.question_set_version ?? '');
        setStyle(s.template_style ?? '');
        setTab(s.tab_label ?? '');
      })
      .catch(() => setMessage('このグループの設定はまだありません（保存で新規作成できます）'));
  };

  const save = () => {
    void apiFetch<GroupSettingDto>(`/groups/${encodeURIComponent(groupId)}/settings`, {
      method: 'PUT',
      body: JSON.stringify({ question_set_version: version, template_style: style, tab_label: tab }),
    })
      .then((s) => setMessage(`保存しました。変更は翌日以降（${s.effective_from ?? ''}）の報告に適用されます`))
      .catch(() => setMessage('保存できませんでした。担当グループか確認してください'));
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">グループ設定</h1>

      <label className="mb-3 block">
        グループ
        <select aria-label="グループ" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="ml-1 border">
          <option value="grp_a">grp_a</option>
          <option value="grp_b">grp_b</option>
          <option value="grp_c">grp_c</option>
        </select>
        <button type="button" onClick={load} className="ml-2 rounded border px-2">
          読み込み
        </button>
      </label>

      <label className="mb-2 block">
        設問セット版
        <input aria-label="設問セット版" value={version} onChange={(e) => setVersion(e.target.value)} className="ml-1 border" />
      </label>
      <label className="mb-2 block">
        シート様式
        <input aria-label="シート様式" value={style} onChange={(e) => setStyle(e.target.value)} className="ml-1 border" />
      </label>
      <label className="mb-2 block">
        タブ表示
        <input aria-label="タブ表示" value={tab} onChange={(e) => setTab(e.target.value)} className="ml-1 border" />
      </label>

      <button type="button" onClick={save} className="rounded border px-3 py-1">
        保存
      </button>
      <p className="mt-3 text-sm text-gray-700">
        変更は翌日以降の報告に適用されます（確定済みの過去報告は変わりません）。
      </p>
      {message && (
        <p role="status" aria-live="polite" className="mt-2">
          {message}
        </p>
      )}
    </main>
  );
}
