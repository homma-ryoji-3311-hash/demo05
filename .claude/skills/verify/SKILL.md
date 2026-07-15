---
name: verify
description: 下流が担う4判定（テスト緑・UI 検証・範囲 diff・シークレット/PII 未混入）を機械的に○×表示する。知識ゼロで判定できることだけを確認する。Use when the user runs /verify after /implement.
disable-model-invocation: true
---

# /verify

初級者が担う判定は**この4つだけ**（ADR-0008・0018）。正しさの担保は機械が、最終判断は層境ゲートが持つ。
すべて機械判定——**知識ゼロで○×できるものしか置かない**。

## 判定1: テストが緑（API 層と UI 層の両方）

- 受け入れテストを **JSON レポータ付きで**実行し、**生出力を貼る**。「passed」の要約行だけでなく、失敗数を含むサマリを提示する。

  ```sh
  pnpm --filter @staff-report/api test -- <当該 *.integration.test.ts> \
    --reporter=default --reporter=json --outputFile=../../test-results/api-last-run.json
  pnpm --filter @staff-report/web test -- <当該 *.acceptance.test.tsx> \
    --reporter=default --reporter=json --outputFile=../../test-results/ui-last-run.json
  ```

- `*.integration.test.ts` と `*.acceptance.test.tsx` の**両方**が緑であること。片方でも失敗 → ✗。
  （UI テストが無いスライスは、仕様表の画面要件に「画面なし」が明記されている場合のみ免除。）

### 偽緑の反転確認（ADR-0018・決定5 の翻訳）

**UI acceptance テストが緑になったら、それが実装由来の緑かを確かめる。**
RTL テストは実装コンポーネントを直接 import して render するので、確認は grep で機械判定できる:

- 当該 `*.acceptance.test.tsx` が `features/<feature>` の**実装コンポーネントを import して render しているか**。
  MSW ハンドラや自前のダミー JSX だけを検証するテストは画面を見ていない——✗。上流の翻訳欠陥として停止・報告する。
- API 層も同様: `*.integration.test.ts` が `app.ts`（合成ルート）経由で **実 HTTP（supertest）** を叩いているか。
  use-case を直接呼ぶだけのテストは契約を見ていない——報告する。

## 判定2: UI 層の検証（golden 導入まで DOM アサーションで代替・ADR-0008/0018）

- 現状この repo に golden スクリーンショット基盤（Playwright）は無い。UI の受け入れは
  `*.acceptance.test.tsx` の **role/label ベースの DOM アサーション**（`getByRole` / `getByLabel` / `getByText`）が緑であること。
  これは判定1 に含まれるので、ここは「DOM アサーションで代替・判定1 で確認済み」と書く。
- `e2e/`（Playwright）導入後は `toHaveScreenshot()` の pixel 差分がここに入る。**目視で見比べない。**
- 画面要件が「画面なし」のスライスのみ「該当なし」にできる。**「検証しづらい」を「該当なし」にしない**（ADR-0018）。

## 判定3: 範囲 diff 突き合わせ（ADR-0018・本命）

**「機械判定の緑」と「指示書 §1 のゴール文」の乖離を捕まえる唯一の判定。** 上流の翻訳が間違っていても、ここで落ちる。

- 指示書「3. 触ってよいファイル範囲」に挙がった**全ディレクトリ**に diff があるかを、`git diff --name-only` と突き合わせて機械判定する。
- 指示書 §3 に `apps/web/src/features/report/**` と書いてあるのに web の diff が**1行も無い**なら ✗。**テストが緑でも ✗。**
- 触らずに緑になったなら、間違っているのは実装ではなく**テストか指示書**である。下流の裁量で解決してよい問題ではない。**停止して上流へ返す。**

```
$ git diff --name-only
# 指示書 §3 の各ディレクトリを1つずつ照合する
# 例: §3 = [apps/service/src/report/, apps/web/src/features/report/]
#     diff に apps/service/src/report/... はある、apps/web/src/features/report/... が無い → ✗
```

## 判定4: シークレット・PII が混ざっていない

`git diff` と直近のテスト出力に対して以下を検査する。1件でもヒットしたら ✗。

- シークレット: `API_KEY` / `SECRET` / `TOKEN` / `PASSWORD` / `-----BEGIN .* PRIVATE KEY-----` / `sk-[A-Za-z0-9]{20,}`
- PII: メールアドレス / 電話番号（`0\d{1,4}-\d{1,4}-\d{4}`）/ マイナンバー形式（12桁連番）
- 実データの痕跡: `*.sql` ダンプ / `fixtures/real*`
- 参考: lefthook の pre-commit でも secretlint が回るが、commit は統合役の仕事なので**ここで先に検査する**。

## 出力

```
## /verify 結果
- [○/✗] テストが緑            … api <passed n / failed m> / ui <passed n / failed m>
                                 （ui 緑なら実装コンポーネント import を grep で確認: [確認済/偽緑=✗]）
- [○/✗/該当なし] UI 検証       … <DOM アサーションで代替・判定1 で確認済み / 画面なし>
- [○/✗] 範囲 diff             … 指示書 §3 の全ディレクトリに diff <あり / 欠落: apps/web/src/features/...>
- [○/✗] シークレット・PII なし  … <検出 0件 / 検出内容>

判定: 全て○ → /submit へ進んでよい
      1つでも✗ → /implement に戻る（✗のまま /submit しない）
      範囲 diff が✗ → /implement では直せない。停止して上流へ返す（ADR-0018）
```

**✗ のまま `/submit` を実行しない。** 判定を人の目視だけに委ねない。
