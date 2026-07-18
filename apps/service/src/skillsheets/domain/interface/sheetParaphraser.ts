import type { MasterData } from './masterReader.js';
import type { SkillSheetContent } from '../model/skillSheet.js';

/**
 * AI言い換えの抽象化層（提供元非依存・overview §5・Summarizer 型）。
 * 実装は infra/paraphraser/ に置き、app.ts（コンポジションルート）で注入する。
 * use-case はこの型にのみ依存し、プロバイダ（OpenAI/Bedrock 等）を直接呼ばない。
 * マスターに無い数値・事実は創作しない＝抽出/言い換えのみ（出力は固定スキーマ・AC-2）。
 */
export interface SheetParaphraserInterface {
  paraphrase(summary: MasterData['summaryJson']): Promise<SkillSheetContent>;
}
