# pending: Stop ゲートの誤検知修正（stop-gate.sh）— 2026-07-18

/ flywheel 草案①の実装記録。分類: **ハーネスの欠陥**（AIアーキ確定領分）。確定物は chore/flywheel-2026-07-18 の PR。

## 観察

slice-06 セッションで、実テストが緑（auth.api 5/5・auth.ui 2/2・CI 全 pass・PR #40 merged）にもかかわらず、Stop のたびに「STOP GATE: status=failed」が**約8回**発火した。

## 真因（当初の草案①の診断は誤り）

草案①は「harness_stop の exitCode を誤読」と推測したが、実装を読むと **`test-results/.last-run.json`（Playwright の結果）を読む正しい設計**だった。真因は別の2つ:

1. **パス不一致（主因）**: 受け入れは `acceptance/` から走り、`testDir:'.'`＋既定 outputDir のため Playwright は **`acceptance/test-results/.last-run.json`** に書く。旧 stop-gate は **repo 直下 `test-results/.last-run.json`** を読んでいた。後者は過去の実行が残るだけで更新されず、**2日前(2026-07-16)の無関係な failed を読み続けていた**。
2. **全スイート汚染（副因）**: full 実行（/verify の回帰・統合役の総合テスト）だと**未実装スライス（slice-05 previous・slice-07 home）の先置きテスト**が赤で `status:failed` になる。ゲートは「現スライスの赤」と「範囲外スライスの赤」を区別できず、現スライスが緑でも完了をブロックする。

## 修正（実装済み・chore/flywheel-2026-07-18）

- `.claude/hooks/stop-gate.sh`:
  - (1) **実出力を読む**: `acceptance/test-results/.last-run.json` を優先（無ければ repo 直下へフォールバック）。
  - (2) **スライス帰属スコープ**: `acceptance/test-results/results.json`（Playwright json レポータ）があれば、指示書 §2 の受け入れ spec を突き合わせ「**現スライスの spec が赤か**」だけで判定。範囲外（未実装スライス）の赤は無視して allow（ADR-0018: 完了条件は現スライスの緑）。results.json が無ければ従来どおり保守的にブロック（**回帰なし**）。
- `.claude/skills/verify/SKILL.md`・`implement/SKILL.md`: 受け入れ実行に json レポータを付け、`acceptance/test-results/results.json` を残す指示を追加（スコープ判定を有効化）。

検証: bash 構文 OK。スコープ python はサンプル＋実 results.json で確認（auth 5/5→OWN 空→allow／auth.ui 赤→block）。パス修正後 `.last-run.json` は passed を返し allow。

## 残・上流フォローアップ（PM/AIアーキ）

- **より堅牢な有効化**: json レポータを `acceptance/playwright.config.ts` の `reporter` に常設すれば skill の実行規律に依存せず results.json が必ず残る。ただし `acceptance/` は **spec/* からしか書けない**（protect-paths.sh・ADR-0004）ため、この1行追加は **spec/* PR**（PM/AIアーキ）で行う。本 chore PR では skill 指示による interim 有効化に留める。
- **強制力の階段**: 現在は「宣言（skills 本文）＋ hook 実装」。json レポータ常設で「実行時強制」に1段上がる。飛び級はしない。

## 発生回数の追記（2026-07-18・slice-07/slice-05 セッション）

#41 マージ後の main でも、**残存パターン**が2回再発した（slice-07・slice-05 の /verify）:

- /verify 判定1 の **frontend 停止「反転確認」**（ADR-0018・決定5）は `ui.spec` を**わざと赤**にする。
  この赤が `acceptance/test-results/.last-run.json` を `failed` に更新する。
- そのとき反転実行を `--reporter=list`（json なし）で回すと **results.json が更新されず**、
  stop-gate のスライス帰属スコープが効かずフォールバックで `.last-run.json=failed` を読み **block**。
- 回避: /verify の最後に**全緑を json レポータ付きで再実行**して `.last-run.json` を `passed` に戻す（毎回手動で実施）。

**含意**: (1) 「残・上流フォローアップ」の **json レポータ config 常設（#44）を早くマージ**すれば、
反転実行が list-only でも results.json が必ず残り、この残存パターンが消える。
(2) `/verify` SKILL.md に「**反転確認の直後は全緑を list,json で再実行して締める**」を1行明記する（宣言・AIアーキ確定）。
2ストライク成立（slice-07・slice-05）。

## 剪定

CLAUDE.md は 146 行で健全・本件で本体に足す行は無い（すべて hook / skills / config）。
