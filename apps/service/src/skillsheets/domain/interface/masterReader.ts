/**
 * 合成マスター元データの1件（消費者 seam の入力）。数値を含めない（AC-2 の検証源）。
 * 実データとの突合は後続（slice-11/12）。
 */
export interface MasterData {
  staffName: string;
  summaryJson: {
    achievements: string[];
    skills: string[];
    issues: string[];
  };
}

/**
 * 合成マスターの read ポート（slice-08）。生成の第1フェーズ「データ組立」の入力源。
 * use-case はこの型にのみ依存する。既定実装は app.ts（合成ルート）で seed 済みインメモリを注入する。
 */
export interface MasterReaderInterface {
  findByStaffId(staffId: string): Promise<MasterData | null>;
}
