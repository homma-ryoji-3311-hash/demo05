/**
 * 呼び出しユーザーが manager かを読む cross-module ポート（slice-19）。
 * 設問セットの操作は manager のみ（staff は 403）。実体は auth を薄くラップして role を読む（合成ルート）。
 */
export interface ManagerContextReaderInterface {
  isManager(userId: string): Promise<boolean>;
}
