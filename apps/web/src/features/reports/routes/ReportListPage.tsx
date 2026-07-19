import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchReports,
  fetchMyReportStatus,
  type ReportDto,
  type ReportStatusOpportunityDto,
  type FulfillmentStatus,
} from '../api/reportsApi';

/**
 * S5 業務報告一覧（slice-04 AC-1 の画面側）＋本人の履行状況（slice-15 AC-6・read-only）。
 * - 自分の報告のみ・日付の新しい順（絞り込みと並びは backend が担う）。
 * - 各行に日付と状況（下書き/確定）をテキストで示す（色だけに頼らない・非機能要件）。
 * - 本人の履行状況（提出済み/遅延提出/未報告/欠勤/報告漏れ）を read-only で表示する
 *   （計上・承認などの操作導線は本人には出さない・slice-15 AC-6）。
 */
const STATUS_LABEL: Record<string, string> = { draft: '下書き', confirmed: '確定' };

/** 履行状況5ステータスのテキスト（色だけに頼らない・slice-15）。 */
const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  submitted: '提出済み',
  late: '遅延提出',
  missing: '未報告',
  unreported_flagged: '報告漏れ',
  absent: '欠勤',
};

type LoadState = 'loading' | 'ready' | 'failed';

export function ReportListPage() {
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [fulfillment, setFulfillment] = useState<ReportStatusOpportunityDto[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    void Promise.all([fetchReports(), fetchMyReportStatus()])
      .then(([list, status]) => {
        if (!active) return;
        setReports(list);
        setFulfillment(status);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">業務報告一覧</h1>

      {state === 'ready' && (
        <ul className="divide-y rounded border">
          {reports.map((report) => (
            <li key={report.id}>
              <Link to={`/reports/${report.id}`} className="flex gap-4 p-3 hover:bg-gray-50">
                <span>{report.report_date}</span>
                <span>{STATUS_LABEL[report.status] ?? report.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 本人の履行状況（read-only・slice-15 AC-6）。計上・承認などの操作導線は本人には出さない。
          非 list 要素で描画する（回帰 slice-28）: /reports の list role は業務報告一覧の1つに保ち、
          slice-04 の getByRole('list') 単一マッチを壊さない。テキスト表示は維持（slice-15 UI-AC）。 */}
      {state === 'ready' && fulfillment.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">履行状況</h2>
          <div className="divide-y rounded border">
            {fulfillment.map((o) => (
              <div key={o.id} className="flex gap-4 p-3">
                <span>{o.date}</span>
                <span>{FULFILLMENT_LABEL[o.status]}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">
        {state === 'loading' && '読み込んでいます'}
        {state === 'failed' && '一覧を取得できませんでした。再試行してください'}
        {state === 'ready' && reports.length === 0 && 'まだ報告がありません'}
      </p>
    </main>
  );
}
