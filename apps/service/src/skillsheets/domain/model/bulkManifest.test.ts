import { describe, expect, it } from 'vitest';
import { BulkForbiddenError, buildManifest } from './bulkManifest.js';

describe('buildManifest（除外者一覧・AC-5）', () => {
  it('generated=entries 数・skipped_staff は除外者 id 一覧', () => {
    const manifest = buildManifest(
      [
        { staff_id: 'bs_1', filename: 'a.xlsx' },
        { staff_id: 'bs_2', filename: 'b.xlsx' },
      ],
      [{ staff_id: 'bs_3', reason: 'no_master' }],
    );
    expect(manifest).toEqual({ generated: 2, skipped: 1, skipped_staff: ['bs_3'] });
  });

  it('全員生成可なら skipped は空', () => {
    expect(buildManifest([{ staff_id: 'bs_1', filename: 'a.xlsx' }], [])).toEqual({
      generated: 1,
      skipped: 0,
      skipped_staff: [],
    });
  });
});

describe('BulkForbiddenError', () => {
  it('kind=forbidden（staff は 403・AC-3）', () => {
    expect(new BulkForbiddenError().kind).toBe('forbidden');
  });
});
