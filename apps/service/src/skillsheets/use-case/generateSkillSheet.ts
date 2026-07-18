import { SkillSheetEntity, SkillSheetForbiddenError, MasterNotFoundError } from '../domain/model/skillSheet.js';
import type { MasterReaderInterface } from '../domain/interface/masterReader.js';
import type { SheetParaphraserInterface } from '../domain/interface/sheetParaphraser.js';
import type { SkillSheetRepositoryInterface } from '../domain/interface/skillSheetRepository.js';

/** YYYYMMDD（ファイル名用・オラクル server.mjs:147 yyyymmdd と同一）。 */
function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * スキルシート生成ユースケース（slice-08 AC-1〜AC-5）。3フェーズを編成する:
 *   1. データ組立     … masterReader で合成マスターを決定的に取得
 *   2. AI言い換え     … sheetParaphraser（抽象化層・数値創作なし）で固定スキーマの content へ
 *   3. テンプレート反映 … filename（[名]_..._YYYYMMDD.xlsx）・署名付き file_url を合成（メタのみ・xlsx 実体は後続）
 * 認可: 他人の staff_id を対象にした要求は 403（deny-by-default）。未認証 401 は境界（authUserId）が担う。
 * 再生成は新 id の別オブジェクトで save＝非破壊（旧版は履歴として残る）。
 */
export class GenerateSkillSheetUseCase {
  constructor(
    private readonly masterReader: MasterReaderInterface,
    private readonly paraphraser: SheetParaphraserInterface,
    private readonly repo: SkillSheetRepositoryInterface,
    private readonly generateId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(input: { userId: string; staffId?: unknown }): Promise<SkillSheetEntity> {
    // 認可: staff_id 省略=自分。他人のマスターは対象にできない（403・AC-5）。
    const target = typeof input.staffId === 'string' && input.staffId.length > 0 ? input.staffId : input.userId;
    if (target !== input.userId) throw new SkillSheetForbiddenError(target);

    // Phase 1: データ組立（seed から決定的取得）
    const master = await this.masterReader.findByStaffId(input.userId);
    if (!master) throw new MasterNotFoundError(input.userId);

    // Phase 2: AI言い換え（抽象化層経由・固定スキーマ・数値創作なし・AC-1/AC-2）
    const content = await this.paraphraser.paraphrase(master.summaryJson);

    // Phase 3: テンプレート反映（メタ: filename・署名付き file_url の合成・AC-3/AC-4）
    const id = this.generateId();
    const now = this.clock();
    const filename = `${master.staffName}_スキルシート_${yyyymmdd(now)}.xlsx`;
    const fileUrl = `https://synthetic-storage.test/skill-sheets/${id}?sig=synthetic`;
    const sheet = SkillSheetEntity.create({
      id,
      staffId: input.userId,
      filename,
      fileUrl,
      createdAt: now.toISOString(),
      content,
    });
    await this.repo.save(sheet); // 再生成は新 id で save＝旧を上書きしない（非破壊）
    return sheet;
  }
}
