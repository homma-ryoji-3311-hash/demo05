/**
 * 雑感（zakkan・L2）の閲覧最小ロールを解決する cross-module ポート（slice-20）。
 * 本人以外で見られるのは「メンタルケア担当」または「その staff の担当 manager」だけ。
 * 本人判定・private 判定は use-case が行い（private は本人のみ）、ここは限定閲覧の最小ロールのみ答える。
 * 主/副担当の区別・権限3軸は slice-24 permission-model（ここは最小ロール一段）。
 */
export interface ZakkanViewerPolicyInterface {
  /** viewer が staff の雑感を限定閲覧できる最小ロール（mental_care もしくは担当 manager）か。 */
  canViewLimited(viewerId: string, staffId: string): Promise<boolean>;
}
