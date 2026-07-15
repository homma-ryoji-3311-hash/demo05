---
name: integrate
description: 統合役専用の二フェーズコマンド。Phase A で当該スライスの再検証（スイート再実行＋シークレット/PII＋差分目視）を行い停止、PM の GO（工程8）後に再実行すると Phase B が gh pr merge → main で総合テストを走らせる。赤は fix-forward（回帰スライスを /board で append）。ADR-0014。Use when the integrator runs /integrate with a PR number.
disable-model-invocation: true
---

# /integrate <PR>

叩けるのは**統合役ただ1人**。`/spec` と同型の二フェーズ（ADR-0014）。
**不可逆操作（マージ）は人の GO（工程8）の後にしか走らない。**

## 禁止事項（最初に読む）

- **PM の GO なしに Phase B へ進まない。** GO は GitHub 上の判定（工程8）。勢い・推測で進めない。
- **ローカル main への push をしない。** マージは `gh pr merge`（server-side）のみ。hook もブランチ保護も迂回しない。
- **総合テストが赤でも巻き戻さない（revert しない）。** fix-forward：回帰スライスを `/board` で append して前に進んで直す。
- Phase A が NG なら層境ゲートに出さず、下流の `/implement` へ差し戻す。
- 「Worked」「Cooked」を成功の証拠にしない。`git log --oneline -3` / テストの**生出力**で確認する。

## フェーズ判定

PR の状態を gh で読む：PM の GO（工程8 の判定コメント / approve）が**まだ無い** → Phase A。**ある** → Phase B。

## Phase A：再検証（工程7）→ 停止

再実行の目的は**再現性の確認**（「下流の環境でだけ緑だった」を潰す）。網羅ではない。

1. **当該スライスのスイートだけ**をローカルで再実行する（全スイートは工程9b の仕事）。

   ```sh
   pnpm --filter @staff-report/api test -- <当該 *.integration.test.ts>
   pnpm --filter @staff-report/web test -- <当該 *.acceptance.test.tsx>   # 画面ありのみ
   ```

   （supertest + InMemory・RTL + MSW なので DB もサーバ起動も不要。）
2. **シークレット・PII チェック**：diff と出力に混入が無いこと（lefthook の secretlint も通す）。
3. **差分の目視**：指示書「3. 触ってよいファイル範囲」に無い変更・意図しないツール呼び出しの痕跡が無いか。
   orval 生成物（`apps/web/src/common/api/generated/`）に手編集の痕跡が無いか（契約変更なら contract と生成物が同時に動く）。
4. 結果を PR にコメントし、**停止する**。「工程8 の PM GO/NO-GO を待ちます。GO 後にもう一度 /integrate <PR> を叩いてください」と伝える。

**NG なら**：層境ゲートに進まない。差し戻し理由を PR に書き、下流の `/implement` へ返す。

## Phase B：マージ → 総合テスト（工程9・9b）

1. **GO を確認する**（GitHub 上の工程8 の判定。無ければ停止して Phase A の結果を再提示）。
2. **`gh pr merge <PR>`** でマージする（server-side。ローカル push なし。squash 時は PR タイトルが
   コミットメッセージになる——`[SRP-N]` 末尾規約は lint-pr が担保済み）。
3. マージ後、`git fetch` → `git log origin/main --oneline -3` の**生出力**で実態を確認する。
4. **総合テスト（工程9b）**：main を checkout し、**リポジトリ全体**を回す。
   狙いは「個別に緑な2つの PR がマージ後に赤」（ADR-0010）。

   ```sh
   pnpm install --frozen-lockfile   # 依存が変わった場合のみ
   pnpm --filter @staff-report/api db:generate
   pnpm typecheck && pnpm lint && pnpm test
   ```

   （`e2e/`（Playwright）導入後は、runner で service :3000 / web :5173 を起動して全 E2E もここに足す。）
5. **緑なら完了。** main の前進が確定。
6. **赤なら fix-forward**：入口を2分岐で分析する（`/flywheel` の2分類を流用し `docs/metrics/` に記録）。

   | 分析結果 | 入口 |
   |---|---|
   | 既存の総合テストが赤（テストは在った） | `/board` append → 工程5 `/brief` で回帰スライス起票 → 工程6 |
   | 総合スイートに穴（捕まえるテストが無い） | `/board` append → 工程3 `/spec` で回帰テストを先に作る |

## 出力

```
## Phase: A / B　　PR: #<番号>

## Phase A（再検証）
当該スイート: 緑/赤（生出力を添付）　シークレット/PII: なし/検出　差分目視: 問題なし/<指摘>
→ 停止。工程8 の PM GO 待ち / NG につき /implement へ差し戻し

## Phase B（マージ＋総合テスト）
マージ: 完了（git log origin/main --oneline -3 の生出力）
総合テスト: 緑（完了） / 赤 → 分析: <既存テストが赤 / スイートに穴> → /board append → /brief または /spec
```
