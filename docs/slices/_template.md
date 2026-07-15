# slice-NN-<slug>

<!--
  スライス指示書テンプレート（`/brief <slice>` が埋める）

  **これが指示書の正本**（ADR-0006）。issue 本文はポインタだけを書く。
  作り手の分担:
    1. ゴール          … PM
    2. 受け入れテスト  … PM（仕様表から）／パスは AIアーキ
    3. ファイル範囲    … AIアーキ（技術的な形）
    4. 貼り付け用の枠  … **リーダー**（このプロジェクトで人間が書く唯一の本物のプロンプト）
    5. 完了の定義      … 共通。変えない
    6. 禁止事項        … **リーダー**
-->

## 1. ゴール

<この1スライスで何が動けば完了か。1〜2文>

## 2. 受け入れテスト（変更禁止・read-only）

**二層とも書く**（ADR-0018）。片方が空欄の指示書は工程5 で差し戻す。

| 層 | パス | 使うもの |
|---|---|---|
| API | `apps/service/src/__tests__/integration/<feature>/<name>.integration.test.ts` | supertest（実 HTTP）＋ InMemory 注入 |
| **UI** | `apps/web/src/__test__/<feature>/<name>.acceptance.test.tsx` | RTL ＋ MSW（実装コンポーネントを render） |

- 仕様表: `docs/spec/slice-NN.md`
- UI 検証の形: RTL の DOM アサーション（golden は Playwright 導入後）

> **UI テストが「なし」なのは、仕様表の画面要件に「画面なし」と明記されている場合だけ**。
> ここが空欄の指示書を受け取ったら、実装せずリーダーへ質問として出す（憲法 §3）。

## 3. 触ってよいファイル範囲

**この一覧は許可であると同時に予告である**（ADR-0018）。
**挙げたディレクトリに diff が1行も無いまま完了報告してはならない。テストが緑でも停止して報告する。**

- `apps/service/src/<feature>/` （domain / use-case / infra / interfaceAdapter）
- `apps/service/src/app.ts`（合成ルートへの配線のみ）
- `apps/web/src/features/<feature>/**`
- 上記範囲の unit テスト（`*.integration.test.ts` / `*.acceptance.test.tsx` 命名は使わない）

**範囲外**：受け入れテスト・`docs/画面仕様/`・`docs/`・`.claude/`・`apps/web/src/common/api/generated/`（orval 生成物。契約変更は contract → `make gen-api`）・`prisma/migrations/`・認証 / AI整形 / DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-NN-<slug> を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  *.integration.test.ts（API）と *.acceptance.test.tsx（UI）の両方です。
  まず現状の赤を確認してください（pnpm --filter で当該テストのみ実行。JSON レポータ付き）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<ここにこのスライス固有の注意を1〜2行だけ足す。例: バリデーション失敗は 400（ZodError）>
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.integration.test.ts` と `*.acceptance.test.tsx` の両方**
2. UI 層の検証: `*.acceptance.test.tsx` の DOM アサーションが緑（golden 比較は Playwright 導入後・ADR-0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only` と突き合わせ）
4. シークレット・PII が出力・差分に無い

> 3 は「緑」と「指示書 §1 のゴール文」の乖離を検知するための判定である（ADR-0018）。
> 触らずに緑になったなら、**実装ではなくテストか指示書が間違っている**。上流へ返す。

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`docs/画面仕様/`・orval 生成物の変更（＝仕様と answer key と生成物）
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- <このスライスで着手してはいけない別スライスの領域>
