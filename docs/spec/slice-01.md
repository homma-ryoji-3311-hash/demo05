---
slice: slice-01-report-draft
approved: true          # PM／AIアーキが grill を確認し true にするまで Phase B は acceptance/ を書けない
---

# slice-01 report-draft — 報告の下書き作成・自動保存

> 振る舞いの正本: `reference-mock/spec.md §3.2` / `reference-mock/phase1-plan.md` ステップ5。
> REST 表現（パス/メソッド/ステータス）は `docs/design/overview.md §3`（🟥 ★PM）。

## AC-1 本文を伴う下書きを新規作成できる

- source: reference-mock        # 振る舞い（下書き自動保存）／201・status は overview §3 の ★PM
- **Given** ログイン済みスタッフ（fixture user）
- **When** `POST /reports` に `{ raw_text, report_date }` を送る
- **Then** `201` が返り、`status=draft` の報告が作成され、`id` が採番される

## AC-2 下書き本文を自動保存で更新できる

- source: reference-mock        # spec.md §3.2「常時自動保存」
- **Given** 自分の下書き報告（status=draft）
- **When** `PATCH /reports/:id` に更新後の `raw_text` を送る
- **Then** `200` が返り、`raw_text` が更新され、`status` は `draft` のまま

## AC-3 確定済み報告は編集できない

- source: PM        # ★確定後不変は reference-mock（§3.4）だが、拒否コード 409 は overview §3 の新規決定
- 理由: 参照モックはステータスコードを規定しない。確定済みへの `PATCH` は競合として `409` を返す設計。
- **Given** 自分の確定済み報告（status=confirmed）
- **When** `PATCH /reports/:id` で本文を変えようとする
- **Then** `409` が返り、本文は変更されない（確定後不変・原則6）

## AC-4 不正な入力は 422 を返す

- source: PM        # ★バリデーション失敗＝422 は Express 側の設計（CLAUDE.md §6）
- 理由: 参照モック（FastAPI）は 422 が既定。Express は明示的に 422 を返す必要がある。
- **Given** ログイン済みスタッフ
- **When** `POST /reports` に `report_date` を欠いた不正なボディを送る
- **Then** `422` が返り、報告は作成されない

## 画面要件

- 対象画面: S3 業務報告入力（`docs/画面仕様/エンジニア/日報入力画面/03_業務報告入力画面.md`）
- golden 撮影: 可（入力フォームのある画面）
- **UI-AC（source: PM。参照モックに画面が無い＝本当の設計）**
  - 本文テキストエリアに入力すると、明示の保存操作なしに下書きが自動保存され、保存状態がテキストで示される（色だけに依存しない・非機能要件）。
  - 再訪時に保存済み下書きが復元表示される。

## 合成フィクスチャ（PM 所有）

**本番/実データは一切入れない**（憲法 §1-6）。

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| user.email | L1 | `staff01@example.test` | 本人 PII。合成ドメイン |
| user.name | L1 | `テスト 太郎` | 合成氏名 |
| user.role | L0 | `staff` | — |
| report.raw_text | L0 | `本日はダッシュボードの改修を実施。` | 客先機密を含めない合成本文 |
| report.report_date | L0 | `2026-07-15` | — |

> 迷ったら上位（厳しい側）へ。客先名・実案件名は入れない。
