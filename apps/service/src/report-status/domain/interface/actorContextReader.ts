/**
 * 操作ユーザーが manager かを読む cross-module read ポート（slice-15）。
 * 報告漏れ計上・欠勤承認・サイクル設定は manager のみ（本人は read-only・AC-6）。
 * auth 本体には触れず userRepository を薄くラップして role だけを読む（templates の userContextReader と同型）。
 */
export interface ActorContextReaderInterface {
  isManager(userId: string): Promise<boolean>;
}
