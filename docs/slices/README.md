# スライスレジストリ

`/board` が所有する全スライスの索引（採番・依存順・現在地）。**正本はこのファイル**（`docs/slices/README.md`）。

- **番号は不変・append-only**（ADR-0013）。一度採った `slice-NN` は振り直さない。分割・回帰で生じる新スライスは末尾に append する。
- **状態は書き込まない。** 「今どの工程か」は `/board` が git ブランチ・`approved: true`・指示書/PR の有無・gh から**推論して表示**する（このファイルには状態列を持たない）。
- 採番は工程2（`docs/design/overview.md` の縦切り分解 → `/board` 採番）で行った。出所は `overview`。
- 1スライスの受け渡しパケット（スライス指示書）は `docs/slices/slice-NN.md`。**このレジストリとは別物**（前者は全体の索引、後者は1スライス）。

## 採番方針（この初回バッチ）

- **縦切り**（各スライスは端まで薄く貫く1機能）。層別（バックエンドだけ・画面だけ）にしない。
- **粒度: 受入基準 ≤3〜5。** 1 slice = 1 issue = 1 session。
- **依存順**に並べる。フェーズ順（Phase 1→6）が第一の依存軸。
- Phase 1 の slice-01〜05 は認証（slice-06）より先に置く。理由: 参照モックで最も仕様が安定する報告フローを先頭に据える方針（playbook「初スプリントで通すもの」）。受け入れテストは seeded fixture user を前提にし、認証の本実装は slice-06 で被せる。

## レジストリ

| slice_id | slug | 依存 | 概要 | フェーズ | 由来 |
|---|---|---|---|---|---|
| slice-01 | report-draft | — | 報告の下書き作成・本文の自動保存（`POST`/`PATCH /reports`、S3 業務報告入力） | 1 | overview |
| slice-02 | report-summarize | 01 | AI要約生成。`Summarizer` 抽象化層で構造化 JSON（incidents/achievements/issues/skills）を返す（`POST /reports/:id/summarize`、S4） | 1 | overview |
| slice-03 | report-confirm | 02 | 要約の確認・編集・確定。確定後は本文・要約を不変化（`POST /reports/:id/confirm`、S4） | 1 | overview |
| slice-04 | report-list | 01 | 自分の報告一覧・詳細。確定済み報告の参照（`GET /reports`・`GET /reports/:id`、S5） | 1 | overview |
| slice-05 | previous-reference | 01,03 | 前回本文・前回 AI 要約の読み取り専用参照（`GET /reports/:id/previous`、S3） | 1 | overview |
| slice-06 | auth-authz | 01 | Google OAuth ログイン＋権限境界の強制（自分のデータのみ／他人は 403、`/auth/*`・`/me`、S1） | 1 | overview |
| slice-07 | staff-home | 04,06 | スタッフ用ホーム（今日の報告状況・未確定下書き・報告入力への導線、S2） | 1 | overview |
| slice-08 | skillsheet-generate | 03 | スキルシート生成（データ組立→AI言い換え→テンプレート反映）。固定 JSON スキーマ・数値創作なし（`POST /skill-sheets`） | 2 | overview |
| slice-09 | skillsheet-view | 08 | スキルシート閲覧・プレビュー(PDF/HTML)・xlsx ダウンロード・生成履歴（S6） | 2 | overview |
| slice-10 | excel-template-manage | 08 | Excel テンプレート管理（アップロード・アンカー検証・有効版切替・履歴、S7） | 2 | overview |
| slice-11 | project-linking | 03 | 確定時の案件キー紐づけと INCIDENTS ステータス（発生/対応中/解決） | 3 | overview |
| slice-12 | reconcile-master | 11 | 突合・増分マージ。案件キー単位で MASTER_SUMMARIES を最新状態へ更新 | 3 | overview |
| slice-13 | notification-settings | 06 | 通知設定（リマインド時刻・Slack/メール ON/OFF・TZ 表示、S9） | 4 | overview |
| slice-14 | admin-console | 06 | 管理者コンソール/スタッフ一覧（担当グループ別タブ・報告状況・最新シート、S8） | 4 | overview |
| slice-15 | report-cycle-status | 14 | 報告サイクル・締切・報告ステータス（提出済/遅延/未報告/欠勤/報告漏れ） | 4 | overview |
| slice-16 | slack-reminder | 13,15 | Slack リマインド（短間隔ジョブが対象ユーザーを DB 抽出して送信・保存 UTC/判定ローカル） | 4 | overview |
| slice-17 | staff-approval | 14 | 承認待ち／承認・担当紐付け（新規スタッフは deny-by-default、S12） | 4 | overview |
| slice-18 | voice-input-stt | 01 | 音声入力・STT（Web Speech → テキスト集約、確定前に誤認識修正、S3 拡張） | 5 | overview |
| slice-19 | question-template-editor | 17 | 設問テンプレート編集（回答形式・役割タグ・公開前ガードレール・版管理、S10） | 6 | overview |
| slice-20 | wellbeing-soft-questions | 19 | ウェルビーイング/ソフト設問（雑感を AI 変換・シート反映から完全除外・閲覧限定） | 6 | overview |
| slice-21 | bulk-download | 09,14 | 一括ダウンロード（全員分生成・ZIP・客先/部署/グループ絞り込み、S11） | 6 | overview |
| slice-22 | group-settings | 19 | グループ別設定（設定駆動・コード分岐なし・変更は翌日以降の報告へ適用） | 6 | overview |
| slice-23 | ai-follow-up-question | 03,22 | AI追加質問（薄い項目に一度だけ質問→本文追記→要約再生成・degrade で報告は必ず出せる） | 6 | overview |
| slice-24 | permission-model | 17 | 権限3軸（操作権限レベル/担当範囲/機微情報アクセス）・主担当/副担当・個人単位担当関係・system/super admin 細分化（phase2-design §1〜4） | 6+ | overview |
| slice-25 | report-history-appeal | 15 | スタッフ本人の履行状況の異議申立て手段（誤記録への申立て・phase2-design §6.9 未決④） | 6+ | overview |
| slice-26 | ai-followup-advanced | 23,24 | AI追加質問の後続（管理画面でのカテゴリ付替・定型質問の高度運用・チーム別基準・データモデル精緻化・report-quality §12.5 の5,6） | 6+ | overview |
| slice-27 | fix-template-manage-aria | 10 | 回帰: slice-10 の `TemplateManagePage` の `<ul aria-label>` が form テストの `getByLabel(/テンプレート\|アップロード\|ファイル/)` に二重マッチ→strict mode 違反（工程9b の総合 E2E で検出）。aria-label を `/版\|履歴/` は満たしつつ衝突語を外す1行修正 | 2 | regression-of-slice-10 |
| slice-28 | fix-report-list-double-list | 15 | 回帰: slice-15 が `/reports` に履行状況の `<ul role=list>` を追加→slice-04 `reports/list.ui` の `getByRole('list')` が二重マッチ→strict mode 違反（工程9b の総合 E2E で検出・ADR-0010）。履行状況を非 list 要素（`<div>`）で描画し業務報告一覧の list role を1つに保つ数行修正（テキスト表示は維持・slice-15 UI-AC 不変） | 4 | regression-of-slice-15 |

> 由来の値：`overview`（基本設計由来）／`split-of-slice-NN`（分割）／`regression-of-slice-NN`（回帰・ADR-0014）。
> **slice-24〜26 は 2026-07-15 の凍結解除（overview §8.5）で生じたスコープアウト先の backlog。** 番号は不変・append-only。仕様表は後続フェーズで起こす。

## フェーズ境界（ADR-0016・フェーズ型大バッチ）

上流フェーズは**全スライスの仕様表（工程3）＋翻訳（工程4）を回し切ってから**下流フェーズへ移る。
Phase 1（slice-01〜07）を先頭バッチとし、以降 Phase 2〜6 を順に上流化する。**下流フェーズ突入の前に CI（マージキュー）が必須**（Step 3）。
