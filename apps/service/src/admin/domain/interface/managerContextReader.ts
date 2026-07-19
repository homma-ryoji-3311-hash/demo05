/** 要求ユーザーの認可コンテキスト（role＝manager 判定／groups＝担当グループ）。 */
export interface ManagerContext {
  role: string;
  groups: string[];
}

/**
 * 認可に必要なユーザー属性の read ポート（slice-14）。auth 本体には触れず user を read だけする
 * （templates の userContextReader と同型・合成ルートで auth の userRepository を薄くラップして注入）。
 * groups は user.groups（複数）を優先し、無ければ group_id を単一要素として扱う（オラクル managerGroups と同義）。
 */
export interface ManagerContextReaderInterface {
  findByUser(userId: string): Promise<ManagerContext | null>;
}
