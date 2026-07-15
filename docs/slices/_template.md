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

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/<feature>/<name>.api.spec.ts` | backend |
| **UI** | `acceptance/<feature>/<name>.ui.spec.ts` | **backend ＋ frontend** |

- golden: `acceptance/golden/<name>.png` ／ または **撮影不可**（理由は仕様表の画面要件）
- 仕様表: `docs/spec/slice-NN.md`

> **UI spec が「なし」なのは、仕様表の画面要件に「画面なし」と明記されている場合だけ**。
> ここが空欄の指示書を受け取ったら、実装せずリーダーへ質問として出す（憲法 §3）。

## 3. 触ってよいファイル範囲

**この一覧は許可であると同時に予告である**（ADR-0018）。
**挙げたディレクトリに diff が1行も無いまま完了報告してはならない。テストが緑でも停止して報告する。**

- `apps/service/src/<feature>/` （`*.router.ts` / `*.service.ts` / `*.repository.ts` / `*.schema.ts`）
- `apps/web/app/<path>/**`
- 上記範囲の unit テスト

**範囲外**：`acceptance/` `reference-mock/` `docs/` `.claude/` 認証 / 要約 / DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-NN-<slug> を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で