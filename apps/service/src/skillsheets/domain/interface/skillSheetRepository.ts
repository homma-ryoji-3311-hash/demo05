import type { SkillSheetEntity } from '../model/skillSheet.js';

/**
 * 生成物スキルシートの保存・取得ポート（slice-08）。
 * 再生成は新 id で save＝非破壊（旧版を上書きしない・履歴の観測は slice-09）。
 * use-case はこの型にのみ依存する。実装は infra/repository/（インメモリ／Prisma）。
 */
export interface SkillSheetRepositoryInterface {
  save(sheet: SkillSheetEntity): Promise<void>;
  findById(id: string): Promise<SkillSheetEntity | null>;
}
