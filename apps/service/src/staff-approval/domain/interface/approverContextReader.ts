/**
 * 呼び出しユーザーが super admin かを読む cross-module ポート（slice-17）。
 * 承認・承認待ち一覧は super admin のみ（AC-2/AC-4）。実体は auth を薄くラップして role を読む（合成ルート）。
 * 主/副や system/super admin の細分化は slice-24 permission-model（ここは super admin 一段のみ）。
 */
export interface ApproverContextReaderInterface {
  isSuperAdmin(userId: string): Promise<boolean>;
}
