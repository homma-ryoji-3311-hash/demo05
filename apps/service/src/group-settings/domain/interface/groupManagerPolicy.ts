/**
 * グループ設定の編集担当 manager を解決する cross-module ポート（slice-22）。
 * - isGroupManager: そのグループの編集担当 manager か（担当外 manager・staff は編集不可・AC-4）。
 * - isManager: 一般の manager か（移管の実行権限・AC-5）。
 * 担当範囲の正確な解決（権限3軸）は slice-24 permission-model（ここは編集担当と manager 一段のみ）。
 */
export interface GroupManagerPolicyInterface {
  isGroupManager(userId: string, groupId: string): Promise<boolean>;
  isManager(userId: string): Promise<boolean>;
}
