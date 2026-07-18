import { useEffect, useState } from 'react';
import { fetchSkillSheets, fetchSkillSheetPreview, type SkillSheetDto } from '../api/skillSheetsApi';

/**
 * S6 スキルシート閲覧（slice-09 AC-1/AC-2/AC-5 の画面側）。読み取り専用（生成物を変更しない）。
 * - 自分のシートのみ・生成日時の新しい順（絞り込みと並びは backend が担う）。
 * - 各行に生成日時（版の識別）・ファイル名・元 xlsx のダウンロード導線・HTML プレビュー導線。
 * - プレビューは backend が返す HTML をそのまま領域に表示する（PDF/画像でない・PM決定）。
 */
type LoadState = 'loading' | 'ready' | 'failed';

/** 生成日時の日付部分（版の識別・seed は 2026-07-1x）。 */
function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function SkillSheetListPage() {
  const [sheets, setSheets] = useState<SkillSheetDto[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchSkillSheets()
      .then((list) => {
        if (!active) return;
        setSheets(list);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, []);

  const onPreview = (id: string): void => {
    void fetchSkillSheetPreview(id)
      .then(setPreviewHtml)
      .catch(() => setPreviewHtml('<p>プレビューを取得できませんでした</p>'));
  };

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">スキルシート一覧</h1>

      {state === 'ready' && sheets.length > 0 && (
        <ul aria-label="スキルシート一覧" className="divide-y rounded border">
          {sheets.map((sheet) => (
            <li key={sheet.id} className="flex items-center gap-4 p-3">
              <span>{formatDate(sheet.created_at)}</span>
              <span className="flex-1">{sheet.filename}</span>
              {/* 元の xlsx を取得（プレビュー変換でない）。署名付き URL へ直接リンク。 */}
              <a href={sheet.file_url} download className="text-blue-600 underline">
                ダウンロード
              </a>
              <button
                type="button"
                onClick={() => onPreview(sheet.id)}
                className="rounded border px-2 py-1 hover:bg-gray-50"
              >
                プレビュー
              </button>
            </li>
          ))}
        </ul>
      )}

      {previewHtml !== null && (
        <section
          role="region"
          aria-label="プレビュー"
          className="mt-4 rounded border p-4"
          // backend が返す HTML（合成 content のみ・外部入力なし）をそのまま表示する。
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}

      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
        {state === 'loading' && '読み込んでいます'}
        {state === 'failed' && '一覧を取得できませんでした。再試行してください'}
        {state === 'ready' && sheets.length === 0 && 'まだスキルシートがありません'}
      </p>
    </main>
  );
}
