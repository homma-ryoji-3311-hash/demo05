# 草案（pending）: Playwright バージョン pin と golden 環境方針（A3 / ADR-0008）

> `/flywheel` 方式の書き戻し草案。**確定は人（PM／AIアーキ）が `docs/adr/` へ**（0008 の追補 or CLAUDE.md 追記）。
> 起票: 2026-07-15（Step0 項目 A3）。物理実装は Step 2（acceptance/ 構築時）に行う。

## なぜ「今は決定だけ」か

- Playwright は**未インストール**、`acceptance/` は**未存在**、CI でも未使用。
- **`acceptance/` はハーネスで read-only**（宣言＋hook＋CI の三層）。承認済み `/spec` 経由でしか書けないため、
  `acceptance/playwright.config.ts` や依存追加は **Step 2 の spec ワークフローで入る**（単体では作れない）。
- ADR-0008 の 2026-07-15 追記どおり、**現物の参照モックは文書ベースで撮る画面が無い** →
  UI 検証は golden(pixel) でなく **role/label の DOM アサーションへ縮退**（ADR-0018）。
  よって「pixel 安定のためのブラウザ pin」は**この repo では主目的にならない**。
  それでも browser 駆動 E2E の**決定性**のためにバージョン pin 自体は有効。

## 決定（Step 2 で適用する）

1. **バージョン pin（厳密）**: `@playwright/test@1.61.1`（キャレット無し・exact）。
   Playwright はパッケージ版にブラウザビルドを紐付けるため、版固定＝ブラウザ固定。
   更新は「意図的な PR」でのみ（golden 撮り直しとセットで）。
2. **単一ブラウザ**: `chromium` プロジェクトのみ（OS/フォント差の面を最小化）。
3. **決定的環境**: golden の撮影・比較は**固定環境（CI の Linux コンテナ・イメージと fonts を pin）**でのみ権威を持つ。
   ローカルの `--update-snapshots` は正本にしない（`acceptance/` read-only と同じ思想）。
4. **配置**: 依存と `playwright.config.ts` は `acceptance/` パッケージに置く（root ではない）。
   ランタイム: Node `>=22`・pnpm `10.x`（本 repo の engines と一致）。
5. **撮れない画面**: golden を持たないスライスは DOM アサーション（ADR-0018）。pin の主眼はそちらの E2E 決定性。

## ブロッカー / 依存

- **A1 参照モック**が未用意 → acceptance/ を意味のある形で作れない。A3 の物理実装は A1 → Step 2 の後。
- 確定は人が `docs/adr/`（0008 追補）or `CLAUDE.md` へ。
