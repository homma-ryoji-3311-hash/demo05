---
slice: slice-11-project-linking
approved: true
---

# slice-11 project-linking — 確定時の案件キー紐づけと INCIDENTS ステータス

> 振る舞いの正本: `reference-mock/spec.md §3.3`（L128/130）・データモデルは `spec.md §4`（PROJECTS／REPORT_PROJECTS／INCIDENTS・L219-221）。
> 依存: slice-03（報告確定）。フェーズ: 3。
> ねらい: 報告確定時に対応案件を**案件キー**で既存案件へ紐づけ、後段の突合（slice-12）を決定的にする土台を作る。
>
> **2026-07-19 --regrill**: 参照モックは振る舞い・データモデルのみを規定し **HTTP ワイヤ契約を持たない**（オラクル未実装）。
> 確定エンドポイントの request/response 形を PM grill で pin した（下記「HTTP 契約」・全て `source: PM`）。これが本スライスの「本当の設計」。

## HTTP 契約（source: PM・grill 2026-07-19 で確定）

確定は slice-03 の `POST /reports/:id/confirm` を**拡張**する（新エンドポイントは足さない・Q1）。

**リクエスト** `POST /reports/:id/confirm`
```jsonc
{
  "summary": { "incidents": [], "achievements": [], "issues": [], "skills": [] },  // 既存(slice-03)。省略時は ai_summary_json にフォールバック(#45)
  "projects": [                                   // 対応案件（0件以上）。案件ごとに incidents をネスト(Q2)
    {
      "project_key": "PJ-ACME-001",               // 案件キー（突合キー・必須）
      "client_name": "得意先アルファ",             // 任意。新規案件作成時のみ使用
      "contribution": "認証基盤の改修を担当",       // REPORT_PROJECTS.contribution
      "incidents": [ { "status": "対応中" } ]      // status ∈ {発生, 対応中, 解決}
    }
  ]
}
```

**レスポンス** `200`（Q3・従来 report に紐づけ結果を加える）
```jsonc
{
  "id": "...", "user_id": "...", "report_date": "...", "raw_text": "...",
  "status": "confirmed", "ai_summary_json": {...}, "confirmed_summary": {...},   // 既存(slice-03)
  "projects":  [ { "id": "p_xxx", "project_key": "PJ-ACME-001", "client_name": "得意先アルファ", "status": "対応中" } ],
  "incidents": [ { "project_id": "p_xxx", "status": "対応中" } ]
}
```
- `projects` 未指定の確定は従来どおり（`projects: []` / `incidents: []`）。slice-03 の挙動は不変。
- **PROJECT.status（source: PM・要 PM 確認）**: 当該案件の最新インシデント status を反映（インシデント無しは `発生`）。§4 PROJECTS.status を満たす最小定義。AC は PROJECT.status の具体値には依存させない。

## AC-1 報告確定時に対応案件を案件キーで既存案件へ紐づける

- source: reference-mock（振る舞い）／HTTP 契約は source: PM（上記）
- **Given** `projects:[{project_key, contribution}]` を含む確定リクエスト（その案件キーの PROJECT が当該ユーザーに既存）
- **When** `POST /reports/:id/confirm`
- **Then** `200`。レスポンス `projects[].project_key` が一致し、REPORT_PROJECTS 相当の紐づけが作られる（`projects[].id` が既存案件の id と同一＝重複作成しない）

## AC-2 INCIDENTS は「発生／対応中／解決」のステータスを持つ

- source: reference-mock（振る舞い）／HTTP 契約は source: PM
- **Given** `projects:[{project_key, incidents:[{status:"対応中"}]}]` を含む確定リクエスト
- **When** `POST /reports/:id/confirm`
- **Then** `200`。レスポンス `incidents` に `{ project_id, status:"対応中" }` が当該案件へ紐づいて含まれる（status は列挙値のいずれか）

## AC-3 未知の案件キーは新規案件として作成する（突合を決定的にする）

- source: PM（案件キー解決規則。参照モックが未知キー挙動を規定しない・overview §4 の新規決定）
- 理由: PROJECTS は `(user_id, project_key)` を持つ（§4）。**同一ユーザー内で案件キーが既存なら既存 PROJECT へ紐づけ、未知なら新規 PROJECT を作成**する（重複作成しない）。これで後段の突合が案件キー単位で決定的になる。
- **Given** そのユーザーに存在しない案件キーを含む確定リクエスト
- **When** `POST /reports/:id/confirm`
- **Then** `200`。当該ユーザー配下に PROJECT が1件新規作成され（`projects[0].id` は新規 id）、その案件へ紐づく。**同一キーで2回目の確定では新規作成されず既存 id へ紐づく**

## AC-4 不正なインシデントステータスは 422 で拒否する

- source: PM（バリデーション失敗コード。CLAUDE.md §6・overview §3）
- 理由: `発生` / `対応中` / `解決` 以外は受理しない。バリデーション失敗は **422**（500/400 では受け入れテストが赤）。**部分適用を残さない**（紐づけ・案件作成・インシデント保存のいずれも行わない）。
- **Given** `incidents:[{status:"未定義値"}]` を含む確定リクエスト
- **When** `POST /reports/:id/confirm`
- **Then** `422`。以後にその報告を読んでも案件紐づけ・新規案件・インシデントが作られていない（原子性）

## 画面要件

- 対象画面: **画面なし**
- 理由: 案件キー紐づけと INCIDENTS ステータスの記録は**報告確定時のサーバ内処理**であり、独立した画面を持たない（突合を決定的にするための内部処理）。紐づけ結果は S4（確定後の要約表示・slice-03）および S8 管理者コンソール（overview §2）等で参照される。
- golden 撮影: 不可（撮影対象画面なし。DOM アサーションではなく API 層の受け入れテストで判定・ADR-0018）
- 二層翻訳: `api.spec.ts` のみ（画面なしのため `ui.spec.ts` は免除・理由を本節に明記＝ADR-0018 の免除条件を満たす）

## 合成フィクスチャ（PM 所有）

**本番/実データは一切入れない**（憲法 §1-6）。迷ったら厳しい側（上位）に倒す。

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| project.project_key | L0 | `PJ-ACME-001` | 案件キー（突合キー）。合成 |
| project.client_name | L1 | `得意先アルファ` | 客先名（守秘対象・§6.2）。合成の仮名 |
| report_projects.contribution | L0 | `認証基盤の改修を担当` | 報告と案件の紐づけ内容 |
| incident.status | L0 | `対応中` | `発生` / `対応中` / `解決` の列挙値 |

## 上流ゲート向けメモ（重点レビュー = source: PM）

- HTTP 契約（confirm body の `projects`・レスポンスの `projects`/`incidents`・PROJECT.status 導出）= grill で pin した新規設計。ここが唯一の「新しく決めたこと」。
- AC 数 4（≤5・分割不要）。status code は 200/422 のみ（422 は仕様・CLAUDE.md §6）。
- 依存: slice-03 confirm を拡張するため、翻訳の acceptance は `acceptance/reports/` 配下（confirm と同居）に置くのが自然（工程4 で確定）。
