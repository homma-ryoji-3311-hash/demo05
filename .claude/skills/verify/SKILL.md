---
name: verify
description: 下流が担う4判定（テスト緑・golden 差分・範囲 diff・シークレット/PII 未混入）を機械的に○×表示する。知識ゼロで判定できることだけを確認する。Use when the user runs /verify after /implement.
disable-model-invocation: true
---

# /verify

初級者が担う判定は**この4つだけ**（ADR-0008・0018）。正しさの担保は機械が、最終判断は層境ゲートが持つ。
すべて機械判定——**知識ゼロで○×できるものしか置かない**。

## 判定1: テストが緑（`api.spec.ts` と `ui.spec.ts` の両方）

- `harness_start` で **backend と frontend の両方**を起動する（1 app_dir = 1 プロセス。`ui.spec.ts` は両方が上がっていないと緑にならない）。ready を待つ。
- 接続先は `ACCEPTANCE_BASE_URL`（API・backend :3000）と `ACCEPTANCE_UI_BASE_URL`（画面・frontend :3001）の**2本**（ADR-0018）。
- 受け入れテストを実行する。**生出力を貼る。** 「passed」の要約行だけでなく、失敗数を含むサマリを提示する。
- `*.api.spec.ts` と `*.ui.spec.ts` の**両方**が緑であること。片方でも失敗 → ✗。

### frontend 停止の反転確認（ADR-0018・決定5）

**`ui.spec.ts` が緑になったら、それが frontend 由来の緑かを確かめる。** ここが工程4 以来はじめて `ui.spec.ts` が緑になりうる場所。

```
ui.spec.ts が緑 → harness_stop(frontend) → 再実行 → ui.spec.ts が【赤】に転ぶ
```

- **赤に転べば正常**（緑は frontend の実装が出していた）。frontend を再起動して次へ。
- **転ばない（緑のまま）なら ✗。** その緑は frontend 由来ではない——テストが画面を実際には見ていない。上流の翻訳欠陥として停止・報告する。4b（工程4 の静的検知・`page.goto()` の有無）をすり抜けた偽の UI spec をここで捕まえる。

## 判定2: golden との pixel 差分が閾値内（ADR-0008・0018）

- golden があるスライス（撮影可）：Playwright の `toHaveScreenshot()` で `acceptance/golden/<name>.png` と pixel 比較する。**目視で見比べない。** 閾値内なら ○、超過なら ✗。
- **撮影不可のスライス**（仕様表の画面要件に「golden 撮影：不可」と明記）：pixel 比較の代わりに、`ui.spec.ts` の **role/label ベースの DOM アサーション**（`getByRole` / `getByLabel` / `getByText`）が緑であること。これは判定1 に含まれるので、ここは「該当なし（DOM アサーションで代替・判定1 で確認済み）」と書く。
- 画面要件が「画面なし」のスライスのみ「該当なし」にできる。**撮影不可を「該当なし」にしない**（撮れないことと検証しないことは別・ADR-0018）。

## 判定3: 範囲 diff 突き合わせ（ADR-0018・本命）

**「機械判定の緑」と「指示書 §1 のゴール文」の乖離を捕まえる唯一の判定。** 上流の翻訳が間違っていても、ここで落ちる。

- 指示書「3. 触ってよいファイル範囲」に挙がった**全ディレクトリ**に diff があるかを、`git diff --name-only` と突き合わせて機械判定する。
- 指示書 §3 に `apps/web/app/**` と書いてあるのに frontend の diff が**1行も無い**なら ✗。**テストが緑でも ✗。**
- 触らずに緑になったなら、間違っているのは実装ではなく**テストか指示書**である。下流の裁量で解決してよい問題ではない。**停止して上流へ返す。**

```
$ git diff --name-only
# 指示書 §3 の各ディレクトリを1つずつ照合する
# 例: §3 = [apps/service/src/reports/, apps/web/app/reports/]
#     diff に apps/service/src/reports/... はある、apps/web/app/reports/... が無い → ✗
```

## 判定4: シークレット・PII が混ざっていない

`git diff` と直近のテスト出力に対して以下を検査する。1件でもヒットしたら ✗。

- シークレット: `API_KEY` / `SECRET` / `TOKEN` / `PASSWORD` / `-----BEGIN .* PRIVATE KEY-----` / `sk-[A-Za-z0-9]{20,}`
- PII: メールアドレス / 電話番号（`0\d{1,4}-\d{1,4}-\d{4}`）/ マイナンバー形式（12桁連番）
- 実データの痕跡: `*.sql` ダンプ / `fixtures/real*`

## 出力

```
## /verify 結果
- [○/✗] テストが緑            … api <passed n / failed m> / ui <passed n / failed m>
                                 （ui 緑なら frontend 停止で赤へ反転: [確認済/未反転=✗]）
- [○/✗/該当なし] golden 差分   … <diff ratio / DOM アサーションで代替 / 画面なし>
- [○/✗] 範囲 diff             … 指示書 §3 の全ディレクトリに diff <あり / 欠落: apps/web/app/>
- [○/✗] シークレット・PII なし  … <検出 0件 / 検出内容>

判定: 全て○ → /submit へ進んでよい
      1つでも✗ → /implement に戻る（✗のまま /submit しない）
      範囲 diff が✗ → /implement では直せない。停止して上流へ返す（ADR-0018）
```

**✗ のまま `/submit` を実行しない。** 判定を人の目視だけに委ねない。
