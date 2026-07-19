import { describe, expect, it } from 'vitest';
import { isThin } from './followUp.js';
import type { StructuredSummary } from './report.js';

const summary = (issues: string[]): StructuredSummary => ({ incidents: [], achievements: [], issues, skills: [] });

describe('isThin（薄さのルール検出・決定的・AC-1）', () => {
  it('対象カテゴリ issues が空なら薄い', () => {
    expect(isThin(summary([]), ['issues'], 5)).toBe(true);
  });

  it('全要素が minLen 未満なら薄い', () => {
    expect(isThin(summary(['短い', 'x']), ['issues'], 5)).toBe(true);
  });

  it('minLen 以上の要素が1つでもあれば薄くない', () => {
    expect(isThin(summary(['十分な長さの課題の説明文']), ['issues'], 5)).toBe(false);
  });

  it('summary が null なら薄い（安全側・質問対象）', () => {
    expect(isThin(null, ['issues'], 5)).toBe(true);
  });

  it('対象外カテゴリの薄さは影響しない（issues のみ判定）', () => {
    // achievements は薄いが対象カテゴリが issues のみなので、issues が充実していれば薄くない
    expect(isThin(summary(['十分な長さの課題の説明文']), ['issues'], 5)).toBe(false);
  });
});
