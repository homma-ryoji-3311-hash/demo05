import { describe, expect, it } from 'vitest';
import {
  greetingContract,
  greetingContractGroup,
  greetingSchema,
} from '../../template/interfaceAdapter/api/contract/greetingContract.js';

describe('greetingContract', () => {
  it('hello エンドポイントを GET / で定義している', () => {
    expect(greetingContract.hello.method).toBe('get');
    expect(greetingContract.hello.path).toBe('/');
    expect(greetingContract.hello.operationId).toBe('getGreeting');
  });

  it('basePath は /api/hello', () => {
    expect(greetingContractGroup.basePath).toBe('/api/hello');
    expect(greetingContractGroup.contracts).toHaveLength(1);
  });

  it('greetingSchema は id/message/createdAt を持つ', () => {
    const result = greetingSchema.safeParse({
      id: 'g1',
      message: 'Hello, World!',
      createdAt: '2026-07-11T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
