---
slice: slice-12-reconcile-master
approved: false
---

# slice-12 reconcile-master — 突合・増分マージによるマスター元データ更新

> 振る舞いの正本: `reference-mock/spec.md §3.4`・§2.4 処理フロー⑤・用語は `CONTEXT.md`（突合／マスター元データ／生報告ログ）。
> データモデル: `spec.md §4` MASTER_SUMMARIES。依存: slice-11（案件キー紐づけ）。フェーズ: 3。
> ねらい: 確定報告を既存マスターへ**増分マージ**し、同一案件キーで状態を最新へ上書きして MASTER_SUMMARIES を更新する。
>
> **2026-07-19 --regrill**: 参照モックは振る舞い・データモデルのみで HTTP ワイヤ契約（＝突合結果の観測経路）を持たない（オラクル未実装）。
> 観測契約を PM grill で pin した（下記「HTTP 契約」・全て `source: PM`）。これが本スライスの「本当の設計」。

## HTTP 契約（source: PM・grill 2026-07-19 で確定）

突合は **AC-5 のとおり確定 `POST /reports/:id/confirm` の同一処理内で同期実行**する（新エンドポイントは足さない・Q1）。
slice-11 の紐づけ（projects/incidents）に続けて突合を走らせ、確定レスポンスに `master_summaries` を加える。

**リクエスト** `POST /reports/:id/confirm`（slice-11 を拡張）
```jsonc
{
  "summary": { ... },                         // 既存(slice-03)
  "projects": [                               // slice-11。incident に突合用の key を任意で持てる（Q・上書きキー）
    { "project_key": "PJ-ACME-001", "contribution": "…",
      "incidents": [ { "key": "INC-1", "status": "対応中" } ] }   // key 省略時は位置/既定キー
  ]
}
```

**レスポンス** `200`（Q1/Q2・slice-11 の report＋projects＋incidents に master_summaries を追加）
```jsonc
{
  "id": "...", "status": "confirmed", "confirmed_summary": {...},          // 既存(slice-03)
  "projects": [ {...} ], "incidents": [ {...} ],                            // slice-11
  "master_summaries": [                                                     // slice-12（§4 の列そのまま・Q2）
    { "user_id": "staff01", "project_id": "p_seed", "period": "2026-07",
      "summary": { "incidents": [ { "key": "INC-1", "status": "解決" } ] }, // 案件キー×期間の突合済み JSON
      "reconciled_at": "2026-07-19T09:00:00Z" }
  ]
}
```
- **period（Q3）**: 当該報告の `report_date` の年月（`YYYY-MM`）。リクエストに period は持たせない（決定的導出）。
- **upsert キー（AC-4）**: `(user_id, project_id, period)`。同キーは重複行を作らず既存行を上書き更新（`reconciled_at` を更新）。
- **summary.incidents（AC-2）**: incident `key` で dedup し、**最新 status で上書き**（追記でない）。key 省略は位置/既定キーで1件。
- **slice-08 masters との関係（Q4）**: 本スライスは MASTER_SUMMARIES を**独立レイヤーとして upsert するのみ**。slice-08 の masterReader が読む先（合成 masters）は変更しない（突合結果をスキルシート入力にする配線は後続）。
- **AC-3（生報告ログ不変）**: REPORTS は一切書き換えない。突合は MASTER_SUMMARIES 側にのみ反映。

## AC-1 全履歴を再処理せず、既存マスターと新報告のみをマージする（増分突合）

- source: reference-mock（振る舞い）／HTTP 契約は source: PM（上記）
- **Given** 既存の MASTER_SUMMARIES（過去に突合済みぶん）と、新たに確定された1件の報告
- **When** 報告を確定する（＝突合が同期で走る）
- **Then** `200`。当該報告の案件×期間の master_summaries 行だけが更新され（既存マスター＋新報告のみのマージ）、他の案件/期間の行は不変

## AC-2 同一案件キーでステータス等を最新で上書きする（単純追記でない）

- source: reference-mock（振る舞い）／HTTP 契約は source: PM
- **Given** マスター上で `INC-1`=「対応中」を持つ案件（同一 project_key・同一 period）
- **When** 同じ案件キー・同じ incident key で「解決」を報告して確定する
- **Then** `200`。master_summaries の当該行の `summary.incidents` は `INC-1` が**1件のまま**で status が「解決」に上書きされる（追記して2件にならない）

## AC-3 生報告ログは不変のまま、更新はマスター元データ側のみに起きる

- source: reference-mock
- **Given** 突合が実行される確定
- **When** マスター元データが更新される
- **Then** 対象報告を後で `GET /reports/:id` しても `raw_text`・`confirmed_summary` 等は確定時のまま（REPORTS 不変）。更新は master_summaries にのみ現れる

## AC-4 突合は案件キー×ユーザー×期間の単位で冪等に upsert する

- source: PM（突合の主キー粒度・冪等性。参照モックが未規定・overview §4 から確定）
- 理由: MASTER_SUMMARIES は `(user_id, project_id, period)` を持つ（§4）。この3要素を upsert キーにし、同一案件・同一期間の複数報告は**行を重複させず1行を上書き**する（`reconciled_at` の更新を除き冪等）。
- **Given** ある案件×期間を突合済みのマスター
- **When** 同一 project_key・同一 period の別報告を確定して再度突合する（同じ内容の incident を報告）
- **Then** `200`。master_summaries の当該 `(project_id, period)` は**1行のまま**、`summary` は同一（`reconciled_at` 以外は結果不変）

## AC-5 確定操作の直後に同期で突合が走り、マスター元データが更新される

- source: PM（突合の実行タイミング＝確定のたび同期実行に決定・overview §8.5 凍結項目7）
- **Given** 未突合の確定対象となる報告
- **When** 報告を確定する（`POST /reports/:id/confirm`）
- **Then** 確定と**同一レスポンス内**に更新後の `master_summaries` が含まれる（別ジョブ・夜間バッチを待たない）

## 決定（PM・2026-07-15）— 突合の実行タイミング

- **突合＝確定のたび同期実行**（source: PM）。overview §8.5 凍結項目7・spec.md §3.4/§9。将来、規模拡大時は夜間バッチへ切替可能な形（突合ロジックを確定操作から分離できる設計）を残す。
- AC-1〜4 はタイミング非依存の突合ロジックの不変条件、AC-5 は同期実行という決定を規定する。

## 画面要件

- 対象画面: **画面なし**
- 理由: 突合は報告確定時のサーバ内処理であり独立画面を持たない。突合結果は S8 管理者コンソール（overview §2）で参照され、スキルシート生成（slice-08）の入力になる。
- golden 撮影: 不可（撮影対象画面なし。API 層の受け入れテストで判定・ADR-0018）
- 二層翻訳: `api.spec.ts` のみ（画面なし → `ui.spec.ts` 免除・理由を本節に明記＝ADR-0018）

## 合成フィクスチャ（PM 所有）

**本番/実データは一切入れない**（憲法 §1-6）。迷ったら厳しい側（上位）に倒す。

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| master.project_key | L0 | `PJ-ACME-001` | 突合キー（slice-11 と同一） |
| master.period | L0 | `2026-07` | report_date の年月（畳み込み単位） |
| incident.key | L0 | `INC-1` | 突合の上書きキー（同一 key は最新で上書き） |
| incident.status（前→後） | L0 | `対応中` → `解決` | 同一 key での上書き例 |
| master.summary | L0 | `{"incidents":[{"key":"INC-1","status":"解決"}]}` | 突合済みマスター JSON |

## 上流ゲート向けメモ（重点レビュー = source: PM）

- HTTP 契約（confirm レスポンスの `master_summaries`・upsert キー `(user_id,project_id,period)`・period 導出・incident key 上書き・slice-08 masters 非更新）= grill で pin した新規設計。
- 依存: slice-11 の紐づけ（project_id）を突合の入力にする。翻訳の acceptance は `acceptance/reports/`（confirm 拡張と同居）。
- AC 数 5（≤5）。status は 200 のみ（不正系は slice-11 の 422 が先に効く）。
