import type { ReminderTarget } from '../model/reminderRule.js';

/**
 * リマインド対象（通知設定＋提出状況を内包）を読む read ポート（slice-16）。
 * cross-module 境界: slice-13 の通知設定・slice-15 の提出状況を1つの抽出源として読むが、
 * 実体の結合は infra（or 合成ルート）に閉じ、ドメインはこのポートだけに依存する。
 */
export interface ReminderTargetReaderInterface {
  listTargets(): Promise<ReminderTarget[]>;
}
