import type { ReminderTargetReaderInterface } from '../../domain/interface/reminderTargetReader.js';
import type { ReminderTarget } from '../../domain/model/reminderRule.js';

/** インメモリの抽出源（テスト・dev）。合成 seed を注入する。 */
export class InMemoryReminderTargetReader implements ReminderTargetReaderInterface {
  constructor(private readonly targets: ReminderTarget[]) {}

  async listTargets(): Promise<ReminderTarget[]> {
    return this.targets;
  }
}

/**
 * オラクル(server.mjs reminderUsers)と同一の合成 seed（slice-16・parity）。実データ・秘密は入れない。
 * - ru_tokyo: 18:00 JST → 09:00Z・slack ON/email OFF（AC-1/AC-3）
 * - ru_sg: 18:00 Asia/Singapore → 10:00Z・両チャネル ON（AC-2/AC-3）
 * - ru_done: 提出済み → 対象外（AC-4）
 * - ru_noslack: Slack/メール OFF → badge のみ（AC-3）
 */
export function seedReminderTargets(): ReminderTarget[] {
  return [
    {
      id: 'ru_tokyo',
      timezone: 'Asia/Tokyo',
      remindLocal: '18:00',
      slackEnabled: true,
      emailEnabled: false,
      submitted: false,
    },
    {
      id: 'ru_sg',
      timezone: 'Asia/Singapore',
      remindLocal: '18:00',
      slackEnabled: true,
      emailEnabled: true,
      submitted: false,
    },
    {
      id: 'ru_done',
      timezone: 'Asia/Tokyo',
      remindLocal: '18:00',
      slackEnabled: true,
      emailEnabled: false,
      submitted: true,
    },
    {
      id: 'ru_noslack',
      timezone: 'Asia/Tokyo',
      remindLocal: '18:00',
      slackEnabled: false,
      emailEnabled: false,
      submitted: false,
    },
  ];
}
