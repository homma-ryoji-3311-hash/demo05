import type { StructuredSummary } from '../model/report.js';

/**
 * AI 要約の抽象化層（提供元非依存・CLAUDE.md §5）。
 * ドメインは「本文 → 固定スキーマの要約」だけを知り、実プロバイダー（fake/実 LLM）に依存しない。
 * 実装は infra/summarizer/ に置き、app.ts で注入する。
 */
export interface Summarizer {
  summarize(rawText: string): Promise<StructuredSummary>;
}
