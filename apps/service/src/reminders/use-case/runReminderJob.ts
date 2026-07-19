import type { ReminderTargetReaderInterface } from '../domain/interface/reminderTargetReader.js';
import type { NotifierInterface } from '../domain/interface/notifier.js';
import {
  ReminderValidationError,
  selectDueTargets,
  utcHHMM,
  type NotifiedEntry,
} from '../domain/model/reminderRule.js';

/**
 * 短間隔リマインドジョブ（slice-16 AC-1〜4）。
 * run_at(UTC) を受け、対象を抽出（ローカル到来＋提出済み除外）→ notifier へ dispatch → sink を返す。
 * ユーザーごとに個別スケジュールは立てず、実行時刻に抽出源を1回引く。実送信は notifier 抽象化層の背後。
 */
export class RunReminderJobUseCase {
  constructor(
    private readonly reader: ReminderTargetReaderInterface,
    private readonly notifier: NotifierInterface,
  ) {}

  async execute(input: { runAt: unknown }): Promise<{ run_at: string; notified: NotifiedEntry[] }> {
    if (typeof input.runAt !== 'string' || Number.isNaN(new Date(input.runAt).getTime())) {
      throw new ReminderValidationError('run_at');
    }
    const runHHMM = utcHHMM(input.runAt);
    const targets = await this.reader.listTargets();
    const notified = selectDueTargets(targets, runHHMM);
    // まずバッジ→設定に従い Slack/メール。実送信は抽象化層の背後（テストは fakeNotifier が sink を捕捉）。
    for (const entry of notified) {
      await this.notifier.send(entry.user_id, entry.channels);
    }
    return { run_at: input.runAt, notified };
  }
}
