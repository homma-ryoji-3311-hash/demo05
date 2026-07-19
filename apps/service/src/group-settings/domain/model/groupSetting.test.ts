import { describe, expect, it } from 'vitest';
import { mergeGroupSetting, nextBusinessDay, type GroupSetting } from './groupSetting.js';

const NOW = new Date('2026-07-15T10:00:00Z');

describe('nextBusinessDay（翌日反映・AC-3）', () => {
  it('翌日の YYYY-MM-DD を返す', () => {
    expect(nextBusinessDay(NOW)).toBe('2026-07-16');
  });
});

describe('mergeGroupSetting（設定駆動・部分更新・AC-2/AC-3）', () => {
  const prev: GroupSetting = {
    group_id: 'grp_a',
    question_set_version: 'v2',
    template_style: 'style_default',
    tab_label: '開発',
    effective_from: '2026-07-01',
  };

  it('指定フィールドだけ更新し、未指定は既存値を保持・effective_from=翌日', () => {
    const next = mergeGroupSetting(prev, 'grp_a', { question_set_version: 'v3' }, NOW);
    expect(next).toEqual({
      group_id: 'grp_a',
      question_set_version: 'v3',
      template_style: 'style_default', // 保持
      tab_label: '開発', // 保持
      effective_from: '2026-07-16', // 翌日
    });
  });

  it('新グループ（prev なし）は設定追加だけで解決される（AC-2）', () => {
    const next = mergeGroupSetting(
      null,
      'grp_c',
      { question_set_version: 'v1', template_style: 'style_c', tab_label: '新規' },
      NOW,
    );
    expect(next.group_id).toBe('grp_c');
    expect(next.template_style).toBe('style_c');
    expect(next.effective_from).toBe('2026-07-16');
  });
});
