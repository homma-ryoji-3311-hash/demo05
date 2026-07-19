import { describe, expect, it } from 'vitest';
import { applySoftAnswersToSummary, parseSoftAnswers } from './softAnswers.js';
import type { StructuredSummary } from './report.js';

const base = (): StructuredSummary => ({ incidents: [], achievements: [], issues: [], skills: ['既存スキル'] });

describe('parseSoftAnswers（slice-20）', () => {
  it('文字列を取り込み・未指定は null・visibility 既定は limited', () => {
    expect(parseSoftAnswers({ ai_use: 'CI', zakkan: '雑感' })).toEqual({
      ai_use: 'CI',
      issue: null,
      shokan: null,
      zakkan: '雑感',
      zakkan_visibility: 'limited',
    });
  });

  it('zakkan_visibility=private を尊重する', () => {
    expect(parseSoftAnswers({ zakkan_visibility: 'private' }).zakkan_visibility).toBe('private');
  });
});

describe('applySoftAnswersToSummary（AI活用→skills・雑感は反映しない・AC-1/AC-2/AC-4）', () => {
  it('AI活用をスキルへ追加する（AC-1）', () => {
    const out = applySoftAnswersToSummary(base(), parseSoftAnswers({ ai_use: 'CI生成に活用' }));
    expect(out.skills).toContain('AI活用: CI生成に活用');
  });

  it('雑感は要約に一切現れない（AC-2・完全除外）', () => {
    const out = applySoftAnswersToSummary(base(), parseSoftAnswers({ zakkan: 'ZAKKAN_SECRET' }));
    expect(JSON.stringify(out)).not.toContain('ZAKKAN_SECRET');
  });

  it('課題・所感は要約へ反映しない（内部・シート非反映）', () => {
    const out = applySoftAnswersToSummary(base(), parseSoftAnswers({ issue: 'ISSUE_X', shokan: 'SHOKAN_Y' }));
    expect(JSON.stringify(out)).not.toContain('ISSUE_X');
    expect(JSON.stringify(out)).not.toContain('SHOKAN_Y');
  });

  it('soft が null なら base を不変で返す（既存 summarize を壊さない）', () => {
    const b = base();
    expect(applySoftAnswersToSummary(b, null)).toBe(b);
  });

  it('スコア・診断キーを一切生成しない（AC-4）', () => {
    const out = applySoftAnswersToSummary(base(), parseSoftAnswers({ ai_use: 'x', zakkan: '疲れ' }));
    for (const k of ['score', 'diagnosis', 'mental_score']) expect(Object.keys(out)).not.toContain(k);
  });
});
