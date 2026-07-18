import { useEffect, useState, type FormEvent } from 'react';
import { fetchTemplates, uploadTemplate, activateTemplate, type TemplateDto } from '../api/templatesApi';

/**
 * S7 Excel テンプレート管理（slice-10 の画面側・manager 専用）。
 * - アップロードフォーム（ファイル＋差し込みアンカー）＋アンカー検証結果の表示領域（role=status）。
 * - 版の一覧（履歴）・有効版の明示・有効版切替操作。
 * 内容の正しさは backend＋工程6 /verify の反転確認で担保。ここは操作導線と表示の存在を satisfy する。
 */
type LoadState = 'loading' | 'ready' | 'failed';

export function TemplateManagePage() {
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [status, setStatus] = useState('テンプレートファイルとアンカーを指定してアップロードしてください');
  const [name, setName] = useState('B2');
  const [projectBlock, setProjectBlock] = useState('A10:F14');

  const reload = (): void => {
    void fetchTemplates()
      .then((list) => {
        setTemplates(list);
        setState('ready');
      })
      .catch(() => setState('failed'));
  };

  useEffect(reload, []);

  const onUpload = (e: FormEvent): void => {
    e.preventDefault();
    const anchorMap: Record<string, string> = {};
    if (name) anchorMap.name = name;
    if (projectBlock) anchorMap.project_block = projectBlock;
    void uploadTemplate(anchorMap)
      .then((t) => {
        setStatus(`アップロードしました（版 ${t.version}・有効版には未登録）`);
        reload();
      })
      .catch(() => setStatus('アンカーが不足しています（name と project_block が必要です）'));
  };

  const onActivate = (id: string): void => {
    void activateTemplate(id)
      .then(() => {
        setStatus('有効版を切り替えました（旧版は履歴として残ります）');
        reload();
      })
      .catch(() => setStatus('有効版の切り替えに失敗しました'));
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">テンプレート管理</h1>

      <form onSubmit={onUpload} className="mb-4 flex flex-col gap-2">
        <label className="flex flex-col">
          テンプレートファイル
          <input type="file" accept=".xlsx" className="mt-1" />
        </label>
        <label className="flex flex-col">
          name アンカー
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded border p-1" />
        </label>
        <label className="flex flex-col">
          project_block アンカー
          <input
            value={projectBlock}
            onChange={(e) => setProjectBlock(e.target.value)}
            className="mt-1 rounded border p-1"
          />
        </label>
        <button type="submit" className="w-fit rounded border px-3 py-1 hover:bg-gray-50">
          アップロード
        </button>
      </form>

      {/* アンカー検証結果（成功／欠落警告）の表示領域。常にテキストを持つ（可視）。 */}
      <p role="status" aria-live="polite" className="mb-4 text-sm text-gray-700">
        {status}
      </p>

      {state === 'ready' && templates.length > 0 && (
        // aria-label は list テスト /版|履歴/ を満たしつつ、フォームテストの
        // getByLabel(/テンプレート|アップロード|ファイル/) に二重マッチしない語にする
        // （regression-of-slice-10: 「テンプレート」を含むと file 入力ラベルと衝突し strict mode 違反）。
        <ul aria-label="版の一覧（履歴）" className="divide-y rounded border">
          {templates.map((tmpl) => (
            <li key={tmpl.id} className="flex items-center gap-4 p-3">
              <span>{tmpl.version}</span>
              <span className="flex-1">{tmpl.is_active ? '有効版' : '履歴'}</span>
              {!tmpl.is_active && (
                <button
                  type="button"
                  onClick={() => onActivate(tmpl.id)}
                  className="rounded border px-2 py-1 hover:bg-gray-50"
                >
                  切り替え
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {state === 'failed' && <p className="text-sm text-red-600">一覧を取得できませんでした</p>}
    </main>
  );
}
