import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/__test__/setup';
import { ReportReviewPage } from '@/features/reports/routes/ReportReviewPage';

/**
 * S4 の確定フローのうち、受け入れテストが捕まえられない穴を塞ぐ回帰テスト。
 * confirm.ui.spec.ts は本文を編集せずに確定するため、「編集した本文が保存されないまま
 * 確定される」欠陥を検知できない（確定後は PATCH が 409 なので回復不能・Audit M-1）。
 */
const DRAFT = {
  id: 'r1',
  user_id: 'staff01',
  report_date: '2026-07-15',
  raw_text: '書きかけの下書き本文。',
  status: 'draft',
};

/** 各テストが観測する、backend が受け取ったリクエスト。 */
let patched: { id: string; rawText: string }[];
let confirmed: { id: string; summary: unknown }[];

beforeEach(() => {
  patched = [];
  confirmed = [];
  server.use(
    http.get('/reports/draft', () => HttpResponse.json(DRAFT)),
    http.patch('/reports/:id', async ({ params, request }) => {
      const body = (await request.json()) as { raw_text: string };
      patched.push({ id: String(params.id), rawText: body.raw_text });
      return HttpResponse.json({ ...DRAFT, raw_text: body.raw_text });
    }),
    http.post('/reports/:id/confirm', async ({ params, request }) => {
      const body = (await request.json()) as { summary: unknown };
      confirmed.push({ id: String(params.id), summary: body.summary });
      return HttpResponse.json({ ...DRAFT, status: 'confirmed' });
    }),
  );
});

describe('ReportReviewPage — 確定時の本文の永続化（Audit M-1）', () => {
  it('本文を編集してから確定すると、確定の前に PATCH で保存される', async () => {
    const user = userEvent.setup();
    render(<ReportReviewPage />);

    const body = await screen.findByLabelText('報告本文（元の入力）');
    await user.clear(body);
    await user.type(body, '編集した本文');
    await user.click(screen.getByRole('button', { name: '確定' }));

    await waitFor(() => expect(confirmed).toHaveLength(1));
    expect(patched).toEqual([{ id: 'r1', rawText: '編集した本文' }]);
  });

  it('本文を編集していなければ PATCH を投げない（余計な書き込みをしない）', async () => {
    const user = userEvent.setup();
    render(<ReportReviewPage />);

    await screen.findByLabelText('報告本文（元の入力）');
    await user.click(screen.getByRole('button', { name: '確定' }));

    await waitFor(() => expect(confirmed).toHaveLength(1));
    expect(patched).toEqual([]);
  });

  it('本文の保存に失敗したら確定しない（未保存のまま不変化させない）', async () => {
    server.use(http.patch('/reports/:id', () => new HttpResponse('boom', { status: 500 })));
    const user = userEvent.setup();
    render(<ReportReviewPage />);

    const body = await screen.findByLabelText('報告本文（元の入力）');
    await user.clear(body);
    await user.type(body, '編集した本文');
    await user.click(screen.getByRole('button', { name: '確定' }));

    expect(await screen.findByText(/確定できませんでした/)).toBeInTheDocument();
    expect(confirmed).toEqual([]);
    expect(screen.queryByText(/確定済み/)).not.toBeInTheDocument();
  });
});
