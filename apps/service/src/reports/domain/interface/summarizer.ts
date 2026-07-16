import type { StructuredSummary } from '../model/report.js';

/**
 * 要約の抽象化層（提供元非依存・overview §5・slice-02 AC-2）。
 * 実装は infra/summarizer/ に置き、app.ts（コンポジションルート）で注入する。
 * use-case はこの型にのみ依存し、プロバイダ（OpenAI/Bedrock 等）を直接呼ばない。
 * プロバイダ名・生レスポンスは境界の外へ出さない（出力は StructuredSummary の4キー固定）。
 * 失敗は例外で表現する（use-case が SummarizerFailedError に変換 → 502）。
 */
export interface SummarizerInterface {
  summarize(rawText: string): Promise<StructuredSummary>;
}
