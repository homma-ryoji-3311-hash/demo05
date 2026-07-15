---
slice: slice-04-report-list
approved: false
---

# slice-04 report-list — 自分の報告一覧・詳細

> 振る舞いの正本: `reference-mock/spec.md §3.9` / `reference-mock/phase1-plan.md` ステップ8。
> 依存: slice-01。

## AC-1 自分の報告一覧を取得できる

- source: reference-mock        # phase1-plan ステップ8「自分の過去報告一覧」
- **Given** 自分の報告が複数ある
- **When** `GET /reports` を呼ぶ
- **Then** `200` が返り、自分の報告のみが日付順で一覧される

## AC-2 報告詳細で本文と確定要約を参照できる

- source: reference-mock        # spec.md §3.9「本文・AI要約の詳細表示」
- **Given** 自分の確定済み報告
- **When** `GET /reports/:id` を呼ぶ
- **Then** `200` が返り、`raw_text` と `confirmed_summary` が含まれる

## AC-3 他人の報告は参照できない

- source: PM        # ★認可境界の強制は reference-mock（phase1 ステップ3）だが、拒否コード 403 は overview §3
- 理由: 参照モックはコードを規定しない。所有者以外のアクセスは `403`（バックエンドで強制・deny-by-default）。
- **Given** 他スタッフが所有する報告
- **When** その `report_id` に `GET /reports/:id` を呼ぶ
- **Then** `403` が返り、内容は一切返らない

## 画面要件

- 対象画面: S5 業務報告一覧・詳細（`docs/画面仕様/エンジニア/日報一覧画面/05_業務報告一覧・詳細画面.md`）
- golden 撮影: 可
- **UI-AC（source: PM）**
  - 一覧に日付・状況（下書き/確定）がテキストで表示される。
  - 行を開くと本文と確定要約の詳細が表示される。

## 合成フィクスチャ（PM 所有）

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| owner.email | L1 | `staff01@example.test` | 本人 |
| other.email | L1 | `staff02@example.test` | 他人（403 検証用） |
| report.status | L0 | `confirmed` | 一覧/詳細対象 |
