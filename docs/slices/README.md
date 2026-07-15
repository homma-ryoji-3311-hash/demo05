# スライスレジストリ（正本）

> **このファイルを編集できるのは `/board` だけ**（ADR-0013）。他のスキル・人は読むだけ。
> 番号は**不変**。振り直し禁止・行の削除禁止（append-only）。
> 状態列は置かない——「今どの工程か」は `/board` が毎回実態（git / ファイル / gh）から推論して表示する。

| slice_id | slug | 概要 | 由来 | 依存 |
|---|---|---|---|---|
| slice-01 | auth-login | 認証基盤・ログイン画面（Google OAuth・許可ドメイン/招待制・ロール別遷移） | overview | ― |
| slice-02 | engineer-home | エンジニア用ホーム画面 | overview | slice-01 |
| slice-03 | report-input-freetext | 業務報告入力（自由文モード・自動下書き保存） | overview | slice-01 |
| slice-04 | ai-summary-review | AI整形結果確認・編集画面（要確認フラグ・確定） | overview | slice-03 |
| slice-05 | report-list-engineer | 業務報告一覧・詳細画面（エンジニア視点） | overview | slice-04 |
| slice-06 | sales-home | 営業担当用ホーム画面 | overview | slice-01 |
| slice-07 | engineer-list | エンジニア一覧（管理）画面 | overview | slice-06 |
| slice-08 | report-list-sales-filter | 業務報告一覧・詳細画面（営業担当視点・フィルタ拡張） | overview | slice-05, slice-07 |
| slice-09 | excel-template-management | Excelテンプレート管理画面 | overview | slice-06 |
| slice-10 | skillsheet-generation-backend | スキルシート生成基盤（データ組み立て→AI変換→テンプレート反映） | overview | slice-08, slice-09 |
| slice-11 | skillsheet-management-ui | スキルシート管理・生成確認画面（一覧・個別生成・PDFプレビュー・DL） | overview | slice-10 |

## 採番ルール（ADR-0013）

- 初回: `docs/必要画面・機能一覧.md`・基本設計から依存順に `slice-01..NN` を一括採番。
- 追加: 既存最大番号の次を付けて**末尾に append**。由来（`split-of-slice-NN` / `regression-of-slice-NN`）を必ず書く。
- 粒度: 受入基準 ≤3〜5 ／ 1 issue = 1 スライス = 1 セッション。
