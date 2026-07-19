import type { StaffRosterReaderInterface } from '../domain/interface/staffRosterReader.js';
import type { SkillSheetZipPackager } from '../infra/zip/skillSheetZipPackager.js';
import {
  BulkForbiddenError,
  buildManifest,
  type BulkEntry,
  type BulkResult,
  type BulkSkipped,
} from '../domain/model/bulkManifest.js';

/** 呼び出しユーザーの manager 判定＋担当グループを読む cross-module ポート（slice-21）。 */
export interface CallerContextReaderInterface {
  resolve(userId: string): Promise<{ isManager: boolean; groups: string[] }>;
}

/** 出力日を YYYYMMDD に整形（AC-4 の機械命名・出力日）。 */
function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * スキルシートの一括生成（slice-21 AC-1〜5）。
 * manager のみ（staff は 403）・自分の担当グループのみ・客先/部署/グループで絞り込み。
 * has_master のみ entries（機械命名）・未生成はスキップ＋manifest（1人の未生成で全体を止めない）。
 * ZIP パッケージングは infra の packager（domain は entries/skipped/manifest 構造だけ扱う＝オラクルと等価）。
 */
export class BulkGenerateSkillSheetsUseCase {
  constructor(
    private readonly roster: StaffRosterReaderInterface,
    private readonly caller: CallerContextReaderInterface,
    private readonly packager: SkillSheetZipPackager,
    private readonly clock: () => Date,
  ) {}

  async execute(input: { userId: string; client?: unknown; dept?: unknown; group?: unknown }): Promise<BulkResult> {
    const ctx = await this.caller.resolve(input.userId);
    if (!ctx.isManager) throw new BulkForbiddenError();
    const roster = await this.roster.list();
    const scope = roster
      .filter((s) => ctx.groups.includes(s.group_id)) // 自分の担当グループのみ
      .filter((s) => (typeof input.group === 'string' ? s.group_id === input.group : true))
      .filter((s) => (typeof input.client === 'string' ? s.client === input.client : true))
      .filter((s) => (typeof input.dept === 'string' ? s.dept === input.dept : true));
    const date = yyyymmdd(this.clock());
    const entries: BulkEntry[] = [];
    const skipped: BulkSkipped[] = [];
    for (const s of scope) {
      if (s.has_master) entries.push({ staff_id: s.id, filename: `${s.name}_スキルシート_${date}.xlsx` });
      else skipped.push({ staff_id: s.id, reason: 'no_master' });
    }
    return this.packager.package({ entries, skipped, manifest: buildManifest(entries, skipped) });
  }
}
