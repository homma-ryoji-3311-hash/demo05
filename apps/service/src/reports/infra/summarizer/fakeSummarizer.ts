import type { Summarizer } from '../../domain/interface/summarizer.js';
import type { StructuredSummary } from '../../domain/model/report.js';

/**
 * 決定的フェイクの要約器（オラクル tools/reference-mock-server/server.mjs の summarize と同一）。
 * 数値・事実を創作しない: 入力に無い数字は足さない（slice-02 AC-3）。
 * 実 LLM への差し替えは Summarizer を実装する別クラスを app.ts で注入するだけでよい。
 */
export class FakeSummarizer implements Summarizer {
  async summarize(rawText: string): Promise<StructuredSummary> {
    const text = (rawText ?? '').trim();
    return {
      incidents: [],
      achievements: text ? [`要約: ${text.slice(0, 24)}`] : [],
      issues: [],
      skills: /ダッシュボード|フロント|改修/.test(text) ? ['フロントエンド'] : [],
    };
  }
}
