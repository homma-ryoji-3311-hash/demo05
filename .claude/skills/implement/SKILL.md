---
name: implement
description: 貼り付け用の枠に沿って実装し、受け入れテストが緑になるまでループする。Vitest（API=integration / UI=acceptance）で採点し、赤ならログを読んで直す。Use when the user runs /implement after /explore.
disable-model-invocation: true
---

# /implement

## 禁止事項（これが最優先。他のすべてに優先する）

1. **commit / push / DBマイグレーションを実行しない。** 実行者は統合役ただ1人。
2. **受け入れテストを一切変更しない。** `apps/service` の `*.integration.test.ts`・
   `apps/web/src/__test__` の `*.acceptance.test.tsx`・`e2e/`＝仕様＝読み取り専用。テストが赤いのは実装が悪いから。
3. **スライス指示書「3. 触ってよいファイル範囲」の外を変更しない。**
4. **`main` 上で作業しない。**
5. **実データを持ち込まない。** フィクスチャは合成データのみ。
6. **緑になったら停止して報告する。** 次のスライスに進まない。PR も作らない（`/submit` の仕事）。
7. **「3. 触ってよいファイル範囲」は許可であると同時に予告**（ADR-0018）。挙げたディレクトリ（例 `apps/web/src/features/report/**`）に **diff が1行も無いまま完了報告してはならない。テストが緑でも停止**して、なぜ触らずに緑になったかを報告する。触らずに緑なら、間違っているのは実装ではなく**テストか指示書**——上流へ返す事由であり、下流の裁量で埋めない。

## 自動停止トリガー（数値で止まる）

- **同一エラーが2回** → 停止。5 Whys を書いて報告する。
- **5ファイル以上を変更、または Edit 5回以上** → 停止して影響範囲を報告する。
- **同じテストを3回リトライして緑にならない** → ハーネスのバグとして報告する。押し切らない。
- 不明点は推測で埋めず、**リーダーへの質問として出して停止**する。

## 手順

1. **枠を読む。** スライス指示書「4. 貼り付け用の枠」の指示に従う。枠に無いことをしない。
2. **赤を確認する。** 受け入れテストは Vitest。**JSON レポータで結果を残しながら**実行する
   （Stop ゲートが `test-results/*.json` を見る）:

   ```sh
   # API 層（supertest + InMemory。DB もサーバ起動も不要）
   pnpm --filter @staff-report/api test -- <当該 *.integration.test.ts> \
     --reporter=default --reporter=json --outputFile=../../test-results/api-last-run.json

   # UI 層（RTL + MSW。指示書 §2 に UI テストがあるスライスのみ）
   pnpm --filter @staff-report/web test -- <当該 *.acceptance.test.tsx> \
     --reporter=default --reporter=json --outputFile=../../test-results/ui-last-run.json
   ```

   **失敗している状態を先に確認**してから書き始める（red → green）。
   手動確認やデバッグでアプリを動かしたいときだけ `teamdev-test-runner` の `harness_start` を使う
   （service :3000 / web :5173。1 app_dir = 1 プロセス。採点はあくまでテストFW）。
3. **規律は `/tdd`。** red → green → refactor。ユニットテストは自分で書いてよい
   （受け入れテスト命名 `*.integration.test.ts` / `*.acceptance.test.tsx` を使わないこと）。
4. **詰まったら `/diagnose`。** 推測でコードを変えない。
5. **最新 API は Context7 に聞く。** 存在しない API を思い出しで書かない。
6. **赤なら** テストの失敗出力・`harness_logs`（runner 使用時）を読んでから直す。読まずに直さない。
7. **API 契約（contract）を変えたら `make gen-api`** で orval 生成物を再生成する（手編集は hook が弾く）。
8. **緑になったら停止・報告。**（runner を使った場合は `harness_stop` してから。）

## 報告フォーマット（証拠ベース。「できました」は禁止）

```
## 結果: 緑 / 赤

## 実行したコマンドと生出力
$ <command>
<出力の該当部分>

## 変更したファイル（<n>件）
- <path> — <何をしたか1行>

## 受け入れテスト
- [x] <基準1>  … <どのテストが緑か>
- [ ] <基準2>  … <未達なら理由>

## 残課題・気づき
- <あれば>
```

次は `/verify`。
