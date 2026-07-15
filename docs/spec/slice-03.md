---
slice: slice-03-report-confirm
approved: false
---

# slice-03 report-confirm — 要約の確認・編集・確定

> 振る舞いの正本: `reference-mock/phase1-plan.md` ステップ7 / `reference-mock/spec.md §3.3・§3.4`。
> 依存: slice-02。

## AC-1 編集した要約で報告を確定できる

- source: reference-mock        # phase1-plan ステップ7
- **Given** 要約済みの下書き報告
- **When** 各項目を編集した要約とともに `POST /reports/:id/confirm` を呼ぶ
- **Then** `200` が返り、`status=confirmed`、編集後の内容が `confirmed_summary` として保存される

## AC-2 確定後は本文・要約が不変になる

- source: reference-mock        # spec.md §3.4・report-quality §5.3（確定後不変・原則6）
- **Given** 確定済み報告
- **When** 本文または要約を変更しようとする
- **Then** 変更は拒否され、確定時点の内容が保持される

## AC-3 二重確定はできない

- source: PM        # ★競合コード 409 は overview §3 の新規決定
- 理由: 参照モックはコードを規定しない。すでに confirmed の報告への再確定は `409`。
- **Given** 確定済み報告
- **When** 再度 `POST /reports/:id/confirm` を呼ぶ
- **Then** `409` が返る

## 画面要件

- 対象画面: S4 AI要約 確認・編集（`docs/画面仕様/エンジニア/日報入力画面/` 系、確認・編集 UI）
- golden 撮影: 可
- **UI-AC（source: PM）**
  - 全項目が編集可能なフォームで表示され、不足・不確実な箇所に「要確認」フラグがテキストで示される（spec.md §3.3）。
  - 元の入力と要約を並べて照合できる。
  - 「確定」操作後は編集不可の確定表示へ切り替わる。

## 合成フィクスチャ（PM 所有）

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| summary.issues | L0 | `["レビュー指摘の再発防止が課題"]` | 編集対象 |
| flags.needs_review | L0 | `["achievements: 定量指標なし"]` | 要確認フラグ例 |
| report.status | L0 | `draft → confirmed` | 遷移 |
