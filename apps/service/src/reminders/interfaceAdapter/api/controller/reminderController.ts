import type { RunReminderJobUseCase } from '../../../use-case/runReminderJob.js';
import type { NotifiedEntry } from '../../../domain/model/reminderRule.js';

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-16 リマインドジョブ）。
 * run_at 欠落・不正の 422 は use-case/ドメイン（ReminderValidationError）が担う。
 */
export class ReminderController {
  constructor(private readonly runJob: RunReminderJobUseCase) {}

  async run(body: unknown): Promise<{ status: number; body: { run_at: string; notified: NotifiedEntry[] } }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const result = await this.runJob.execute({ runAt: b.run_at });
    return { status: 200, body: result };
  }
}
