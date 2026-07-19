import { useState } from 'react';
import { createSpeechRecognizer } from '../../lib/speechRecognition';

/**
 * 音声入力起動＋STT 結果の確認/修正コンポーネント（slice-18・S3 業務報告入力の拡張）。
 * - 起動操作（音声入力）は本文入力欄と併用できる（AC-1）。
 * - STT 結果は取り込み前に確認/修正領域へ提示し、操作して初めて本文へ渡す（自動確定しない・AC-2）。
 * - 権限拒否・認識失敗は本文を保持したままテキストで提示（色のみに依存しない・AC-3）。本文への追記は親が行う。
 */
export function VoiceInput({ onImport }: { onImport: (text: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const start = () => {
    setError(null);
    const rec = createSpeechRecognizer({
      onResult: (t) => {
        setDraft((prev) => (prev ?? '') + t);
        setListening(false);
      },
      onError: (err) => {
        setError(err);
        setListening(false);
      },
    });
    if (!rec) {
      setError('unsupported');
      return;
    }
    setListening(true);
    rec.start();
  };

  const importToBody = () => {
    if (draft && draft.trim()) {
      onImport(draft);
      setDraft(null);
    }
  };

  return (
    <div className="mt-2">
      <button type="button" onClick={start} className="rounded border px-3 py-1">
        音声入力
      </button>
      {listening && (
        <span role="status" aria-live="polite" className="ml-2 text-sm text-gray-600">
          認識中…
        </span>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          音声入力に失敗しました（
          {error === 'not-allowed' ? 'マイクの使用が許可されていません' : '認識できませんでした'}
          ）。本文はそのまま入力を続けられます。
        </p>
      )}
      {draft !== null && (
        <div className="mt-2 rounded border bg-gray-50 p-2">
          <label htmlFor="stt-draft" className="mb-1 block text-sm font-medium">
            音声認識結果（取り込み前に確認・修正できます）
          </label>
          {/* 確認/修正欄。値をテキストとして提示しつつ編集可能——本文には未反映（自動確定しない・AC-2）。
              単一要素にして getByText の二重マッチ（strict mode 違反）を避ける。 */}
          <textarea
            id="stt-draft"
            aria-label="音声認識結果"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-1 w-full rounded border p-1"
          />
          <button type="button" onClick={importToBody} className="mt-1 rounded border px-3 py-1">
            本文へ取り込む
          </button>
        </div>
      )}
    </div>
  );
}
