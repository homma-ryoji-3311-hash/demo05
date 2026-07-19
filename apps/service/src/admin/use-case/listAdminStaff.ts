import { AdminForbiddenError, type AdminStaffRow } from '../domain/model/adminStaffRow.js';
import type { AdminStaffReaderInterface } from '../domain/interface/adminStaffReader.js';
import type { ManagerContextReaderInterface } from '../domain/interface/managerContextReader.js';

/**
 * 管理者コンソールのスタッフ一覧（slice-14）。
 * 認可: manager のみ（staff/未登録は 403・id 参照より先に判定・AC-4）。
 * 可視範囲: 自分の担当グループのみ（担当外はバックエンドで除外・AC-2）。`?group` 指定は担当グループと交差
 * （担当外グループ指定は空・AC-3）。未指定は担当グループ全部（AC-1）。レスポンスにタブ用の担当グループ一覧を含める。
 */
export class ListAdminStaffUseCase {
  constructor(
    private readonly reader: AdminStaffReaderInterface,
    private readonly managerContext: ManagerContextReaderInterface,
  ) {}

  async execute(input: {
    userId: string;
    group?: string | undefined;
  }): Promise<{ groups: string[]; staff: AdminStaffRow[] }> {
    const ctx = await this.managerContext.findByUser(input.userId);
    if (!ctx || ctx.role !== 'manager') throw new AdminForbiddenError();
    const myGroups = ctx.groups;
    // ?group は担当グループと交差（担当外指定は空）。未指定は担当グループ全部。
    const scope = input.group ? (myGroups.includes(input.group) ? [input.group] : []) : myGroups;
    const staff = await this.reader.findByGroups(scope);
    return { groups: myGroups, staff };
  }
}
