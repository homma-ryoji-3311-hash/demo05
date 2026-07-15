---
slice: slice-21-bulk-download
approved: false
---

# slice-21 bulk-download — 一括ダウンロード

> 振る舞いの正本: `reference-mock/spec.md §3.9`（「全員分を生成」・一括ダウンロード ZIP・客先/部署で絞り込み）・
> `§3.5`（スキルシート生成は決定的・最新マスター元データ起点）。
> REST 表現は参照モックに無い＝設計（`overview.md §3` `POST /admin/skill-sheets/bulk`）。
> 依存: slice-09（スキルシート閲覧・DL）・slice-14（管理者コンソール）。画面: S11 一括ダウンロード。

## AC-1 最新マスター元データから全スタッフ分を一括生成し ZIP で出力する

- source: reference-mock        # spec.md §3.9「最新のマスター元データから全スタッフのシートをまとめて再生成」・§3.5
- **Given** 複数スタッフのマスター元データ（MASTER_SUMMARIES）が存在する
- **When** manager が一括生成を実行する（`POST /admin/skill-sheets/bulk`）
- **Then** 各スタッフのシートが最新マスターから生成され、まとめて ZIP として出力される

## AC-2 客先・部署・グループで対象を絞り込める

- source: reference-mock        # spec.md §3.9「一括ダウンロード（ZIP、客先・部署で絞り込み）」・「タブはグループに対応」
- **Given** 複数の客先・部署・グループにまたがるスタッフ
- **When** 客先／部署／グループの条件を指定して一括生成する
- **Then** 条件に一致するスタッフのシートのみが生成・ZIP に含まれる

## AC-3 manager 権限に限定される

- source: reference-mock        # spec.md §1.3・§6.1「アクセス境界はバックエンドで強制」（管理者機能）
- 補足: 認可失敗の HTTP コードは 🟥 PM（`403`・deny-by-default・overview §3）
- **Given** staff 権限の利用者
- **When** 一括生成を実行しようとする
- **Then** `403` が返り、生成も ZIP も返らない。manager は自分の担当グループのスタッフのみを対象にできる

## AC-4 出力ファイル名を機械的に付与する

- source: reference-mock        # spec.md §3.5「[スタッフ名]_[ファイル名]_YYYYMMDD.xlsx をサーバ側で機械的に付与」
- **Given** 一括生成の対象スタッフ
- **When** ZIP を生成する
- **Then** 各エントリのファイル名が `[スタッフ名]_[ファイル名]_YYYYMMDD.xlsx`（日付は出力日）で付与される
- 未定: 対象スタッフにマスター元データが無い（未生成）場合の一括時の扱い（スキップするか／その旨を記す注記を含めるか）。spec.md §3.9 は個別行では「未生成の場合はその旨を表示」とするが、一括 ZIP での縮退挙動は規定が無く未定。

## 画面要件

- 対象画面: S11 一括ダウンロード（`docs/design/overview.md §2`。DOM 詳細は参照モックに無い＝設計）
- golden 撮影: 可
- **UI-AC（source: PM）**
  - 理由: 参照モックは画面の DOM・文言を規定しない。絞り込みと一括操作の UI はここで確定する。
  - 客先／部署／グループの絞り込みコントロールが表示される。
  - 「全員分を生成」操作と、生成後の ZIP ダウンロード導線が表示される。
  - 対象件数や未生成スタッフの有無がテキストで示される（状態は色のみに頼らない・非機能要件）。

## 合成フィクスチャ（PM 所有）

**本番/実データは一切入れない**（憲法 §1-6）。

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| staff.name | L1 | `テスト 太郎` | ファイル名生成 |
| staff.client | L1 | `A社`（合成） | 絞り込みキー |
| staff.dept | L0 | `開発部` | 絞り込みキー |
| staff.group_id | L0 | `grp_engineer` | 絞り込みキー |
| master_summary.exists | L0 | `true` / `false` | 未生成スタッフの扱い検証用 |
| output.filename | L0 | `テスト 太郎_スキルシート_20260715.xlsx` | 命名規則 |
