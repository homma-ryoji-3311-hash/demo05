import { useEffect, useState } from 'react';
import { apiFetch } from '@/common/api/client';

/**
 * 未承認スタッフの承認待ち画面（slice-17）。deny-by-default のため報告フローには入れず、
 * 自分の承認状態（/me の status）を read-only で確認できる（/me は pending も許可・AC-1）。
 */
export function PendingApprovalPage() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ status?: string }>('/me')
      .then((me) => setStatus(me.status ?? 'active'))
      .catch(() => setStatus(null));
  }, []);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">承認待ち</h1>
      <p>アカウントは管理者（super admin）の承認待ちです。承認されると報告フローに入れます。</p>
      {status && (
        <p role="status" aria-live="polite" className="mt-2">
          現在の状態: {status === 'pending' ? '承認待ち' : status}
        </p>
      )}
    </main>
  );
}
