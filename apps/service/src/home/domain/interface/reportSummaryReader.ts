/**
 * home フィーチャーが必要とする報告データの最小ポート（依存の向きを home 側に閉じる）。
 * reports フィーチャーを直接 import せず、app.ts で reports のリポジトリを構造的に注入する
 * （no-cross-feature-import。共有は「home が要求する形」をここで宣言する）。
 */
export interface HomeReportView {
  id: string;
  status: string;
}

export interface ReportSummaryReader {
  findByUser(userId: string): Promise<HomeReportView[]>;
}
