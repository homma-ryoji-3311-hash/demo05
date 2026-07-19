/**
 * 本人の TZ を読む cross-module read ポート（slice-13）。auth 本体には触れず user を read だけする
 * （templates の userContextReader と同型・合成ルートで auth の userRepository を薄くラップして注入）。
 * 未設定ユーザーは既定（Asia/Tokyo）を返す（オラクル userTz の `?? 'Asia/Tokyo'` と同義）。
 */
export interface UserTimezoneReaderInterface {
  getTimezone(userId: string): Promise<string>;
}
