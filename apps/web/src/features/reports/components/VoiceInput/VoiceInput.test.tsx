import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceInput } from './VoiceInput';

/** SpeechRecognition スタブ（実音声を使わない・憲法 §1-6）。 */
function stubSpeech(kind: 'ok' | 'fail', transcript = '認識テキスト') {
  class FakeSR {
    onresult: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    start() {
      setTimeout(() => {
        if (kind === 'ok') this.onresult?.({ results: [[{ transcript }]] });
        else this.onerror?.({ error: 'not-allowed' });
        this.onend?.();
      }, 0);
    }
    stop() {}
  }
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeSR;
}

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

describe('VoiceInput（slice-18・STT 抽象層の裏で degrade）', () => {
  it('音声結果を確認欄に提示し、取り込みで初めて親へ渡す（自動確定しない・AC-2）', async () => {
    stubSpeech('ok', '午後はレビュー。');
    const onImport = vi.fn();
    render(<VoiceInput onImport={onImport} />);
    await userEvent.click(screen.getByRole('button', { name: /音声入力/ }));
    // 確認欄（textarea）に認識結果が出る（本文には未反映＝自動確定しない）。
    expect(await screen.findByDisplayValue('午後はレビュー。')).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled(); // 取り込み前は本文へ渡さない
    await userEvent.click(screen.getByRole('button', { name: /取り込/ }));
    expect(onImport).toHaveBeenCalledWith('午後はレビュー。');
  });

  it('権限拒否は alert でテキスト提示し、本文へは渡さない（degrade・AC-3）', async () => {
    stubSpeech('fail');
    const onImport = vi.fn();
    render(<VoiceInput onImport={onImport} />);
    await userEvent.click(screen.getByRole('button', { name: /音声入力/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/許可|失敗/);
    expect(onImport).not.toHaveBeenCalled();
  });
});
