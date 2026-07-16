---
slice: slice-10-excel-template-manage
approved: true
---

# slice-10 excel-template-manage — Excel テンプレート管理

> 振る舞いの正本: `reference-mock/spec.md §3.9`（Excel テンプレート管理・アンカー検証付き）・`§7`（アップロード・アンカー検証・有効版の切り替え）。
> 依存: slice-08（生成が参照する有効版テンプレートを供給）。フェーズ: Phase 2。画面: S7。対象: manager。
> REST 表現（パス/メソッド/コード）と画面 DOM は参照モックに無い＝🟥 `source: PM`。

## AC-1 アンカー検証付きでテンプレートをアップロードできる

- source: reference-mock        # spec.md §3.9・§7（アンカー検証付き）
- **Given** manager と、アンカー（＝差し込み位置を示すプレースホルダ／名前付き範囲）を含む Excel テンプレート
- **When** テンプレートをアップロードする
- **Then** テンプレートが版として保存され、アンカーが検証される（差し込み位置がテンプレート上に存在するか）

## AC-2 アンカー検証に失敗したテンプレートは受理されない

- source: PM        # ★参照モックは検証失敗時の HTTP コードを規定しない
- 理由: バリデーション失敗は `422`（CLAUDE.md §6・参照モック FastAPI の既定）。欠落アンカーは有効版に登録しない。
- **Given** 必須アンカーを欠く（または壊れた）テンプレート
- **When** アップロードする
- **Then** `422` が返り、そのテンプレートは有効版に登録されない

## AC-3 有効版を切り替えられ、旧版は履歴として残る

- source: reference-mock        # spec.md §3.9・§7（有効版の切り替え）
- **Given** 同一グループに複数版のテンプレートがある
- **When** ある版を有効版に切り替える（`PUT /templates/:id/activate`）
- **Then** 指定版が有効版になり、以降のスキルシート生成はその版を使う。切り替え前の版は履歴として残る（削除されない）

## AC-4 テンプレート管理は manager 権限が必要

- source: PM        # ★参照モックは HTTP 認可コードを規定しない（overview §1 deny-by-default）
- 理由: テンプレート管理は manager のみ。権限境界はバックエンドで強制する。
- **Given** staff ロールのユーザー
- **When** テンプレートのアップロードまたは有効版切替を要求する
- **Then** `403` が返る（未認証は `401`）

## 画面要件

- 対象画面: S7 Excel テンプレート管理（overview §2。対象: manager）
- golden 撮影: 可
- **UI-AC（source: PM）**（参照モックに画面の DOM が無いため本当の設計）
  - テンプレートのアップロードフォームがある。
  - アップロード後、アンカー検証の結果（成功／欠落アンカーの警告）がテキストで表示される。
  - 版の一覧（履歴）が表示され、どれが有効版かが明示され、有効版を切り替える操作がある。

## 合成フィクスチャ（PM 所有）

**本番/実データ・PII・客先名を入れない**（憲法 §1-6）。

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| manager.name | L1 | `管理 花子` | アップロード実行者（本人 PII） |
| manager.group_id | L0 | `grp_synth_eng` | 合成グループ |
| template.version | L0 | `v1` / `v2` | 版・履歴 |
| template.anchor_map | L0 | `{ "name": "B2", "project_block": "A10:F14" }` | 検証対象のアンカー（合成） |
| template.file_url | L0 | `（署名付き URL・合成）` | 保存済みテンプレート |
| template.is_active | L0 | `v2` | 有効版の切替対象 |
| invalid_template.anchor_map | L0 | `{ }` | 必須アンカー欠落（422 検証用） |
