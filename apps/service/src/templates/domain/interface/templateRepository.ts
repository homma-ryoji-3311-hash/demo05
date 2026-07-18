import type { TemplateEntity } from '../model/template.js';

/**
 * Excel テンプレートの保存・取得ポート（slice-10）。
 * 有効版は同一グループ内で排他（切替は旧版を削除せず is_active=false で残す・AC-3）＝データ不変条件は
 * use-case が findByGroup→save で保つ。実装は infra/repository/（インメモリ／Prisma）。
 */
export interface TemplateRepositoryInterface {
  save(template: TemplateEntity): Promise<void>;
  findById(id: string): Promise<TemplateEntity | null>;
  /** 自グループの版一覧（生成日時の新しい順・履歴込み）。版番号採番と有効版切替の対象母集合。 */
  findByGroup(groupId: string): Promise<TemplateEntity[]>;
}
