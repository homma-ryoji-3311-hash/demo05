import { describe, expect, it } from 'vitest';
import { GreetingDomainEntity } from '../../template/domain/model/greeting.js';
import { EmptyGreetingMessageError } from '../../template/domain/error/emptyGreetingMessageError.js';

const now = new Date('2026-07-11T00:00:00Z');

describe('GreetingDomainEntity.create', () => {
  it('メッセージを持つあいさつを作成できる', () => {
    const greeting = GreetingDomainEntity.create({ id: 'g1', message: 'Hello, World!', now });
    expect(greeting.message).toBe('Hello, World!');
    expect(greeting.id).toBe('g1');
  });

  it('メッセージが空ならエラー', () => {
    expect(() => GreetingDomainEntity.create({ id: 'g1', message: '  ', now })).toThrow(EmptyGreetingMessageError);
  });
});

describe('reconstruct', () => {
  it('toJSONの出力から復元できる', () => {
    const original = GreetingDomainEntity.create({ id: 'g1', message: 'Hello, World!', now });
    const restored = GreetingDomainEntity.reconstruct(original.toJSON());
    expect(restored.toJSON()).toEqual(original.toJSON());
  });
});

describe('createdAt', () => {
  it('外部から変更できない（防御的コピー）', () => {
    const greeting = GreetingDomainEntity.create({ id: 'g1', message: 'Hello, World!', now });
    greeting.createdAt.setFullYear(2000);
    expect(greeting.createdAt.getFullYear()).toBe(2026);
  });
});
