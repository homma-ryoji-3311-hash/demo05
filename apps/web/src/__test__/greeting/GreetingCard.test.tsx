import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/__test__/setup';
import { GreetingCard } from '@/features/greeting/components/GreetingCard';

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('GreetingCard', () => {
  it('成功時にメッセージを表示する', async () => {
    server.use(
      http.get('/api/hello', () =>
        HttpResponse.json({ id: 'abc', message: 'Hello, World!', createdAt: '2026-07-11T00:00:00.000Z' }),
      ),
    );

    renderWithClient(<GreetingCard />);

    expect(await screen.findByText('Hello, World!')).toBeInTheDocument();
  });

  it('エラー時にエラー表示を出す', async () => {
    server.use(http.get('/api/hello', () => new HttpResponse('boom', { status: 500 })));

    renderWithClient(<GreetingCard />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
