import type { SoftAnswers, StructuredSummary } from './report.js';

/**
 * ソフト設問回答の正規化（slice-20・オラクル soft-answers 保存と同一）。
 * 未指定は null、zakkan_visibility の既定は limited（本人非公開は private のみ）。
 */
export function parseSoftAnswers(body: unknown): SoftAnswers {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    ai_use: typeof b.ai_use === 'string' ? b.ai_use : null,
    issue: typeof b.issue === 'string' ? b.issue : null,
    shokan: typeof b.shokan === 'string' ? b.shokan : null,
    zakkan: typeof b.zakkan === 'string' ? b.zakkan : null,
    zakkan_visibility: b.zakkan_visibility === 'private' ? 'private' : 'limited',
  };
}

/**
 * ソフト設問を要約へ反映する（slice-20 AC-1/AC-2/AC-4・オラクル applySoftAnswersToSummary と同一）。
 * - AI活用 → スキルへ反映。
 * - 課題(issue)・所感(shokan) → 内部の振り返り（シート非反映・要約に足さない）。
 * - 雑感(zakkan) → Summarizer/要約/シートへ一切渡さない（完全除外・L2）。
 * - スコア・診断・点数は一切生成しない（AC-4）。soft が無ければ base をそのまま返す（既存 summarize 不変）。
 */
export function applySoftAnswersToSummary(base: StructuredSummary, soft: SoftAnswers | null): StructuredSummary {
  if (!soft) return base;
  const skills = [...base.skills];
  if (soft.ai_use && soft.ai_use.length > 0) skills.push(`AI活用: ${soft.ai_use}`);
  return { ...base, skills };
}
