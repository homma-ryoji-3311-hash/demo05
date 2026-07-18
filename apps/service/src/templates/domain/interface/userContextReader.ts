/** 要求ユーザーの認可コンテキスト（role＝manager 判定／groupId＝版の所属グループ）。 */
export interface UserContext {
  role: string;
  groupId: string | null;
}

/**
 * 認可に必要なユーザー属性の read ポート（slice-10）。
 * 指示書 §3「use-case で user.role を read」の seam。auth 本体には触れず、user を read だけする
 * （home の reportSummaryReader と同じく、合成ルートで auth の userRepository を薄くラップして注入）。
 */
export interface UserContextReaderInterface {
  findByUser(userId: string): Promise<UserContext | null>;
}
