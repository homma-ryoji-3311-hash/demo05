import type { SheetParaphraserInterface } from '../../domain/interface/sheetParaphraser.js';
import type { MasterData } from '../../domain/interface/masterReader.js';
import type { SkillSheetContent } from '../../domain/model/skillSheet.js';

/**
 * 決定的フェイク実装（テストダブル）。SheetParaphraserInterface を満たす本物の実装で、
 * 実プロバイダ・実キーを dev/CI に持ち込まずに言い換えフローを検証できる。
 * 実プロバイダ実装は同じ infra/paraphraser/ に別ファイルで足し、app.ts で差し替える。
 *
 * AC-2（マスターに無い数値を創作しない）は抽出/言い換えのみで構造的に守る:
 * 出力はすべて入力マスターに現れた文字列そのもの（career_summary は末尾に固定ラベルを付すのみ）。
 * 入力に数値が無ければ出力にも数値は現れない。オラクル(server.mjs:142 paraphraseSkillsheet)と HTTP 等価。
 */
export class FakeSheetParaphraser implements SheetParaphraserInterface {
  async paraphrase(summary: MasterData['summaryJson']): Promise<SkillSheetContent> {
    return {
      career_summary: (summary.achievements ?? []).map((a) => `${a}（職務経歴）`),
      skills: [...(summary.skills ?? [])],
      issues: [...(summary.issues ?? [])],
    };
  }
}
