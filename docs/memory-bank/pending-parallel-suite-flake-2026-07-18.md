# pending: 全並列スイートで UI テストがフレーク — 共有インメモリ backend の競合（2026-07-18）

> `/flywheel` 方式の書き戻し草案。**確定は人（AIアーキ＝Harness-Keeper・spec/* は PM/AIアーキ）**。
> 起票: 2026-07-18（slice-05 / issue #7 の下流セッション・工程9b 総合テスト中）
> 分類: **ハーネスの欠陥**（テスト基盤・runner/config）

## 観察

`acceptance/reports/summarize.ui.spec.ts`（slice-02「本文入力→要約」）が、
**全並列実行（`npx playwright test reports/` 既定 = `fullyParallel:true`）で赤／単独・直列（`--workers=1`）で緑**、
という**フレーク**を示した。失敗位置が run ごとに変動する（`#summary-achievements` 空 → 「下書きを保存しました」未表示）＝典型的なタイミング競合。

| 実行形態 | 結果 |
|---|---|
| `summarize.ui.spec.ts` 単独 | ✅ 2/2 |
| `reports/` 全並列（既定 workers） | ❌ summarize.ui が赤（位置変動） |
| `reports/` 直列 `--workers=1` | ✅ 26/26 |
| 全スイート直列 `--workers=1`（工程9b） | ✅ **39/39** |

## 真因

`acceptance/playwright.config.ts` は `fullyParallel: true`。一方 backend は **1プロセスの InMemoryReportRepository（`PERSISTENCE=memory`）を全ワーカーで共有**する。
タイミングに敏感な UI フロー（入力ページの 300ms autosave デバウンス → review で保存済み本文を要約）が、
複数ワーカーの同時リクエストで backend が詰まると **debounce/保存の完了待ちが取りこぼされる**。
状態はユーザー単位で隔離されているが、**単一プロセスへの並列負荷そのもの**が競合源。実装の欠陥ではない（直列で 39/39 緑が証拠）。

## なぜ放置できないか

- **工程9b の総合テスト（ADR-0010）と /verify の回帰確認が、実装は正しいのに赤くなる**。「いつもの赤」が本物の回帰を隠す（[[pending-harness-friction-slice-02-2026-07-16]] の commitlint と同型のリスク）。
- 下流が「自分の回帰か？」の切り分けに毎回コストを払う（本セッションで slice-07・slice-05 の2回、切り分けに harness 再起動＋直列再実行を要した）。

## 提案（強制力の階段を1段）

- **現在**: 宣言なし（既定並列のまま）。
- **提案（宣言 → 実行時強制の2段に分けて飛び級しない）**:
  1. **宣言（即・skills 本文・AIアーキ確定）**: `/verify` 判定1 と `/integrate` 工程9b の**全スイート／full 実行は `--workers=1`**で回す、と明記する。根拠は本記録（直列 39/39 緑）。
  2. **実行時強制（次段・spec/* PR が必要）**: `acceptance/playwright.config.ts` に `fullyParallel:false`（または UI プロジェクトのみ `workers:1`）を設定。`acceptance/` は **spec/* からしか書けない**（protect-paths.sh・ADR-0004）ため PM/AIアーキの spec/* PR で行う。**当該スライスの単独実行（stop-gate・工程6）は並列のままで速度を保つ**——full 実行だけ直列化する。
  3. **将来（任意・大きい）**: runner がワーカーごとに backend を別ポートで隔離すれば並列を維持できる。コスト大につき当面は 1/2 で足りる。

## 剪定

CLAUDE.md 本体に足す行は無い（すべて skills / config）。§5 の「runner はアプリを起動するだけ・採点はテストFW」は本件と整合し不変。
