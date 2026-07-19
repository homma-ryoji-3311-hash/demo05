/**
 * STT（音声→テキスト）の差し替え可能な抽象層（slice-18・PM 決定 2026-07-15）。
 * Web Speech API（クライアント側）をこの裏に置き、方式依存 UI/SDK を画面へ直書きしない。
 * サーバ側 STT を後から足す場合もこのインターフェースの実装差し替えで済む。
 */

/** 認識器（開始/停止のみ公開・方式非依存）。 */
export interface SpeechRecognizer {
  start(): void;
  stop(): void;
}

interface SpeechResultLike {
  transcript: string;
}
interface SpeechEventLike {
  results: ArrayLike<ArrayLike<SpeechResultLike>>;
}
interface SpeechErrorLike {
  error: string;
}
interface SpeechRecognitionLike {
  start(): void;
  stop?(): void;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: SpeechErrorLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/**
 * 認識器を生成する。ブラウザが Web Speech API を持たなければ null（呼び出し側が degrade）。
 * onResult は認識テキスト、onError は失敗種別（例: 'not-allowed'）を渡す。実音声はここに閉じ、画面は方式非依存。
 */
export function createSpeechRecognizer(handlers: {
  onResult: (transcript: string) => void;
  onError: (error: string) => void;
}): SpeechRecognizer | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.onresult = (e) => handlers.onResult(e.results?.[0]?.[0]?.transcript ?? '');
  rec.onerror = (e) => handlers.onError(e?.error ?? 'unknown');
  return {
    start: () => rec.start(),
    stop: () => rec.stop?.(),
  };
}
