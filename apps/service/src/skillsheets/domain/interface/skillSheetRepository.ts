import type { SkillSheetEntity } from '../model/skillSheet.js';

/**
 * 生成物スキルシートの保存・取得ポート（slice-08 save/findById／slice-09 で read 系を追加）。
 * 再生成は新 id で save＝非破壊（旧版を上書きしない・履歴として残る）。
 * use-case はこの型にのみ依存する。実装は infra/repository/（インメモリ／Prisma）。
 */
export interface SkillSheetRepositoryInterface {
  save(sheet: SkillSheetEntity): Promise<void>;
  findById(id: string): Promise<SkillSheetEntity | null>;
  /** 自分の生成済みシートを生成日時の新しい順で返す（履歴込み・他人は含めない）。slice-09 AC-1。 */
  findByUser(staffId: string): Promise<SkillSheetEntity[]>;
}
