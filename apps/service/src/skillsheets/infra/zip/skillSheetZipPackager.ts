import type { BulkResult } from '../../domain/model/bulkManifest.js';

/**
 * スキルシート一括の ZIP パッケージング（slice-21・infra）。
 * entries（生成シート）＋除外者 manifest を ZIP 構造へ束ねる。
 * **実 ZIP バイナリ生成は downstream の詳細設計**——ここでは entries/skipped/manifest の構造で表現する
 * （オラクルと構造が等価な semantics fixture）。domain/use-case は ZIP の実体に依存しない。
 */
export class SkillSheetZipPackager {
  package(result: BulkResult): BulkResult {
    // 現段階は構造での表現（実 ZIP は downstream）。entries と manifest を1つの受け渡し単位に束ねる。
    return { entries: result.entries, skipped: result.skipped, manifest: result.manifest };
  }
}
