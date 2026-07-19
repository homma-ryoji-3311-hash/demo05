import { describe, expect, it } from 'vitest';
import { missingPublishRoles, normalizeQuestions, type Question } from './questionSet.js';

describe('normalizeQuestions（正規化＋検証・AC-1/AC-2）', () => {
  it('配列位置で order 採番・required は真偽・text は既定 ""', () => {
    const out = normalizeQuestions([
      { format: 'short', role_tag: 'project_key', text: 'A', required: true },
      { format: 'long', role_tag: 'skill' },
    ]);
    expect(out).toEqual([
      { order: 1, format: 'short', required: true, role_tag: 'project_key', text: 'A' },
      { order: 2, format: 'long', required: false, role_tag: 'skill', text: '' },
    ]);
  });

  it('並べ替え（配列逆順）で order を再採番する', () => {
    const out = normalizeQuestions([
      { format: 'select', role_tag: 'status', text: 'C' },
      { format: 'short', role_tag: 'project_key', text: 'A' },
    ]);
    expect(out?.map((q) => q.order)).toEqual([1, 2]);
    expect(out?.map((q) => q.text)).toEqual(['C', 'A']);
  });

  it('不正な形式は null（→ 422）', () => {
    expect(normalizeQuestions([{ format: 'paragraph', role_tag: 'skill', text: 'x' }])).toBeNull();
  });

  it('不正な役割タグは null（→ 422）', () => {
    expect(normalizeQuestions([{ format: 'short', role_tag: 'unknown', text: 'x' }])).toBeNull();
  });

  it('配列でない入力は null', () => {
    expect(normalizeQuestions('nope')).toBeNull();
  });
});

describe('missingPublishRoles（公開ガードレール・AC-3）', () => {
  const q = (role_tag: string): Question => ({
    order: 1,
    format: 'short',
    required: false,
    role_tag: role_tag as never,
    text: '',
  });

  it('project_key・skill が揃えば空（公開可）', () => {
    expect(missingPublishRoles([q('project_key'), q('skill')])).toEqual([]);
  });

  it('skill が無ければ skill を返す', () => {
    expect(missingPublishRoles([q('project_key')])).toEqual(['skill']);
  });

  it('両方無ければ両方返す', () => {
    expect(missingPublishRoles([q('status')])).toEqual(['project_key', 'skill']);
  });
});
