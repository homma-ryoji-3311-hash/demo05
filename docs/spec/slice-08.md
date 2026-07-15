---
slice: slice-08-skillsheet-generate
approved: true
---

# slice-08 skillsheet-generate — スキルシート（Excel）生成

> 振る舞いの正本: `reference-mock/spec.md §3.5`（生成の3フェーズ分離・出力ファイル名・格納と履歴）。
> 依存: slice-03（確定済み報告＝生成の入力）。フェーズ: Phase 2。
> REST 表現（パス/メソッド/コード）は参照モックに無い＝🟥 `source: PM`（overview §3）。

## AC-1 生成は3フェーズ分離で、データ取得と書き込みは決定的に行う

- source: reference-mock        # spec.md §3.5
- **Given** マスター元データ（案件・スキル集計を含む）が揃ったスタッフ
- **When** スキルシート生成を実行する
- **Then** 「データ組立（DBから決定的に取得）→ AI言い換え（固定 JSON スキーマ）→ テンプレート反映（アンカー位置へ書き込み・書式維持）」の順で処理され、AI は言い換えのみを担う

## AC-2 マスターに無い数値を AI が創作しない

- source: reference-mock        # spec.md §3.5・§5（数値・事実を創作させない）
- **Given** マスター元データに定量値が存在しない項目
- **When** AI言い換え（AI変換）を行う
- **Then** その項目は空欄のまま出力され、数値は創作されない。出力はアンカー対応の固定 JSON スキーマに縛られる

## AC-3 出力ファイル名をサーバ側で機械的に付与する

- source: reference-mock        # spec.md §3.5
- **Given** 生成の実行日
- **When** スキルシートを生成する
- **Then** ファイル名は「[スタッフ名]_[ファイル名]_YYYYMMDD.xlsx」形式（YYYYMMDD は出力日）でサーバ側が機械的に付与する

## AC-4 生成物はストレージ格納＋署名付き URL＋履歴。再生成で新ファイルを残す

- source: reference-mock        # spec.md §3.5（格納と履歴）
- **Given** すでに1度スキルシートを生成済みのスタッフ
- **When** 再生成する
- **Then** 生成物はオブジェクトストレージに格納され、DB にメタデータと署名付き URL が保持される。再生成は新ファイルを作り、旧生成物は履歴として残る（既存は消えない）

## AC-5 生成 API の REST 表現

- source: PM        # ★参照モックは HTTP 表現を規定しない（overview §3）
- 理由: 生成の振る舞いは answer key 由来だが、パス・メソッド・ステータスは新規設計。生成の起点は `POST /skill-sheets`。
- **Given** 認証済みスタッフ（自分のマスター元データが対象）
- **When** `POST /skill-sheets` を呼ぶ
- **Then** `201` と生成シートのメタデータが返る。他人のデータを対象にした要求は `403`、未認証は `401`

## 画面要件

- **画面なし。** 理由: 本スライスは生成 API（`POST /skill-sheets`）に限定する。生成済みシートの一覧・プレビュー・xlsx ダウンロードの閲覧 UI は **slice-09（S6 スキルシート閲覧）**、管理者による一括/再生成の起動導線は **S8 管理者コンソール（Phase 3/4・後続スライス）** が担う。
- golden 撮影: 不可（画面なし）。**完了判定は API 受け入れテスト（実 HTTP）が緑**（ADR-0018）。

## 合成フィクスチャ（PM 所有）

**本番/実データ・PII・客先名を入れない**（憲法 §1-6）。

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| staff.name | L1 | `テスト 太郎` | ファイル名の `[スタッフ名]` に反映（本人 PII） |
| master.project_key | L0 | `PJ_SYNTH_01` | 合成の案件キー |
| master.client_name | L0 | `（合成客先A）` | 客先名は入れず合成ラベルのみ |
| master.summary_json | L0 | `{ achievements:[...], skills:["<合成スキル>"], issues:[] }` | 決定的取得の元。数値は一部空欄で「創作しない」を検証 |
| generated_sheet.filename | L1 | `テスト 太郎_スキルシート_20260715.xlsx` | 出力日でファイル名生成 |
| generated_sheet.file_url | L0 | `（署名付き URL・合成）` | メタデータとして保持 |
