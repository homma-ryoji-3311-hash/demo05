---
doc: 基本設計（overview）
status: draft            # PM／AIアーキが設計凍結ゲート（★source: PM を全解決）を通したら frozen に変える
source_of_truth: reference-mock/    # spec.md / phase1-plan.md / phase2-design.md / report-quality-design.md
approved_by:             # 凍結時に PM または AIアーキが記名（ADR-0017・同列）
---

# 基本設計 — 業務報告・スキルシート生成システム

> **これは設計ではなく answer key の書き起こし**（CONTEXT.md「基本設計」）。正本は `reference-mock/`。
> ゼロから API を考えない。参照モックに無い＝**本当の設計**は `★source: PM` と印を付け、理由を1行添える。
> 大バッチ上流に入る前に、**`★source: PM` を全部解決・必要なら ADR 化する**（設計凍結ゲート・ADR-0016）。

## 凡例（出所の印）

| 印 | 意味 | レビュー |
|---|---|---|
| 🟦 `source: reference-mock` | answer key の書き起こし。実装で緑になって当然 | 通常 |
| 🟥 `★source: PM` | 参照モックに無い＝**本当の設計**。REST パス・ステータス・画面詳細の確定など | **PM／AIアーキが重点レビュー・凍結対象** |

参照モックは**文書ベースで REST エンドポイントを定義していない**（ADR-0018）。したがって
**API のパス・メソッド・ステータスコードはすべて 🟥`★source: PM`**（振る舞いは書き起こし、URL 設計は新規）。
本書ではエンドポイントの「振る舞い」に 🟦、その「REST 表現（パス/メソッド/コード）」に 🟥 を割り当てる。

---

## 0. スコープと段階（reference-mock/spec.md §8・phase1-plan.md）

🟦 価値の中心（テキスト報告 → AI要約 → Excel出力）を最初に縦に通し、その後 音声・通知・グループ別設定へ拡張する。

| フェーズ | 範囲 | 主な画面 |
|---|---|---|
| **Phase 1** | 認証＋テキスト報告＋AI要約・確認・確定・自分の報告閲覧 | ログイン／ホーム／報告入力／AI要約確認・編集／報告一覧・詳細 |
| **Phase 2** | Excelテンプレート＋スキルシート生成・保管・DL | スキルシート閲覧／Excelテンプレート管理 |
| **Phase 3** | 突合・マスター元データ（案件キー単位の増分マージ） | （API 中心。管理者コンソールの詳細に反映） |
| **Phase 4** | 通知（Slack）＋スタッフ別リマインド時刻＋報告サイクル・未報告管理 | 通知設定／管理者コンソール |
| **Phase 5** | 音声入力（Web Speech → 必要に応じサーバ STT） | 報告入力（拡張） |
| **Phase 6** | グループ別設定・設問エディタ・ウェルビーイング・管理者一括・AI追加質問 | 設問テンプレート編集／一括ダウンロード／管理者コンソール |

---

## 1. 利用者と権限（reference-mock/spec.md §1.3・phase2-design.md §1）

🟦 権限境界は画面表示だけでなく**バックエンドで必ず強制**する（deny-by-default）。

| ロール | 対象 | 権限範囲 |
|---|---|---|
| スタッフ（staff） | 客先常駐スタッフ | 自分の報告・スキルシートのみ |
| 管理者（manager） | 営業／管理担当 | 担当グループ／担当スタッフのみ |
| メンタルケア担当 | HR | 全スタッフの雑感を含む閲覧のみ（操作権限なし） |

🟥 `★source: PM` **Phase 1 のロールは `staff` / `manager` の2値**（phase1-plan.md）。phase2-design.md の権限3軸
（操作権限レベル／担当範囲／機微情報アクセス）と system/super admin・主副担当・チャネルは **Phase 2 以降**。
理由: phase2-design.md 自身が「Phase 1 では実装しない」と明記。3軸の細部は多数の未決（後述 §8）を含むため凍結対象。

---

## 2. 画面一覧（reference-mock/spec.md §7・必要画面・機能一覧.md・phase2-design.md §9）

| # | 画面 | 対象 | 概要 | フェーズ | 出所 |
|---|---|---|---|---|---|
| S1 | ログイン | 全 | Google OAuth、許可ドメイン/招待、ロール別遷移 | 1 | 🟥 ★PM（spec.md §3.1 に振る舞い有・画面は 必要画面 由来） |
| S2 | スタッフ用ホーム | staff | 今日の報告状況・未確定下書き・報告入力への導線 | 1 | 🟥 ★PM（必要画面 由来。spec.md §7 に無し） |
| S3 | 業務報告入力 | staff | 自由文入力・下書き自動保存・前回入力/前回要約の参照 | 1 | 🟦 spec.md §3.2 |
| S4 | AI要約 確認・編集 | staff | 構造化結果の確認・修正・要確認フラグ・確定 | 1 | 🟦 spec.md §3.3 |
| S5 | 業務報告一覧・詳細 | staff/manager | 過去報告一覧・本文/AI要約の詳細・確定済み参照 | 1 | 🟦 spec.md §3.9・必要画面 |
| S6 | スキルシート閲覧 | staff | 生成済みシート一覧・プレビュー・xlsx DL・履歴 | 2 | 🟦 spec.md §3.5 |
| S7 | Excelテンプレート管理 | manager | アップロード・アンカー検証・有効版切替・履歴 | 2 | 🟦 spec.md §3.9 |
| S8 | 管理者コンソール/スタッフ一覧 | manager | グループ別タブ・報告状況・最新シート・再生成 | 3/4 | 🟦 spec.md §3.9 |
| S9 | 通知設定 | staff | リマインド時刻・Slack/メール ON/OFF・TZ 表示 | 4 | 🟦 spec.md §3.8 |
| S10 | 設問テンプレート編集 | manager | グループ別設問・回答形式・役割タグ・版管理 | 6 | 🟦 spec.md §3.6 |
| S11 | 一括ダウンロード | manager | 全員分生成・ZIP・客先/部署/グループ絞り込み | 6 | 🟦 spec.md §3.9 |
| S12 | 承認待ち／承認・担当紐付け | staff/manager | 新規スタッフの承認待ち・管理者による承認と担当設定 | 4+ | 🟥 ★PM（phase2-design.md §5・§9。Phase 2 以降） |

🟥 `★source: PM` **各画面の DOM 構造・要素の詳細は `docs/画面仕様/` を参照**するが、受け入れテストが叩く
具体的なセレクタ・表示文言・遷移は各スライスの仕様表（工程3）の「画面要件」で確定する。

---

## 3. API 一覧（🟥 パス/メソッド/ステータスは全て ★source: PM）

> 振る舞いは reference-mock 由来（🟦）だが、**REST 表現は参照モックに無い＝設計**（🟥）。
> Express の `router → service → repository` 一方向（ADR-0011）に写す。**バリデーション失敗は 422**（CLAUDE.md §6）。
> 認可失敗は 403、未認証は 401、対象不存在は 404。

### Phase 1（認証・報告・要約）

| メソッド | パス | 振る舞い | 主なコード | 出所 |
|---|---|---|---|---|
| GET | `/health` | ヘルスチェック | 200 | 🟦 phase1-plan.md |
| GET | `/auth/google` | OAuth 開始（リダイレクト） | 302 | 🟦spec.md§3.1 / 🟥REST |
| GET | `/auth/google/callback` | コールバック→users upsert→セッション発行 | 302/401 | 🟦/🟥 |
| GET | `/me` | ログイン中ユーザー（id/role/group） | 200/401 | 🟦/🟥 |
| POST | `/reports` | 下書き作成（status=draft） | 201/422/401 | 🟦spec.md§3.2 / 🟥 |
| GET | `/reports` | 自分の報告一覧（確定＋下書き） | 200/401 | 🟦spec.md§3.9 / 🟥 |
| GET | `/reports/:id` | 報告詳細（本文・要約）。他人のは 403 | 200/403/404 | 🟦phase1-plan.md / 🟥 |
| PATCH | `/reports/:id` | 下書き自動保存（本文更新）。確定済みは不可 | 200/409/403/422 | 🟦spec.md§3.2 / 🟥 |
| POST | `/reports/:id/summarize` | Summarizer 抽象化層を呼び構造化 JSON を返す | 200/422/502 | 🟦spec.md§3.3 / 🟥 |
| POST | `/reports/:id/confirm` | 編集済み要約で確定（status=confirmed・不変） | 200/409/422/403 | 🟦phase1-plan.md / 🟥 |
| GET | `/reports/:id/previous` | 前回の本文・前回 AI 要約（読み取り専用参照） | 200/401 | 🟦spec.md§3.2 / 🟥 |

🟥 `★source: PM` **要約失敗時のコード**: Summarizer 失敗は `502`（外部依存）とし、報告は下書きとして保持される
（spec.md §6.3「AI失敗時も入力内容を失わない」・report-quality-design.md §10.1）。理由: 参照モックはコードを規定していない。

### Phase 2（スキルシート・Excelテンプレート）

| メソッド | パス | 振る舞い | 出所 |
|---|---|---|---|
| GET | `/skill-sheets` | 自分の生成済みシート一覧（履歴） | 🟦spec.md§3.5 / 🟥REST |
| POST | `/skill-sheets` | マスター元データから生成（データ組立→AI言い換え→openpyxl相当） | 🟦spec.md§3.5 / 🟥 |
| GET | `/skill-sheets/:id/download` | xlsx 署名付き URL | 🟦 / 🟥 |
| GET | `/skill-sheets/:id/preview` | PDF または HTML プレビュー | 🟦 / 🟥 |
| POST | `/templates` (manager) | Excelテンプレートのアップロード＋アンカー検証 | 🟦spec.md§3.9 / 🟥 |
| PUT | `/templates/:id/activate` (manager) | 有効版の切り替え | 🟦 / 🟥 |

### Phase 3-6（突合・通知・サイクル・設問・一括・追加質問）

| メソッド | パス | 振る舞い | フェーズ | 出所 |
|---|---|---|---|---|
| （内部） | 突合ジョブ | 確定のたび案件キー単位で増分マージ→MASTER_SUMMARIES 更新 | 3 | 🟦spec.md§3.4 |
| GET/PUT | `/notification-settings` | リマインド時刻・Slack/メール ON/OFF | 4 | 🟦spec.md§3.8 / 🟥 |
| GET | `/admin/staff` (manager) | 担当グループのスタッフ一覧・報告状況 | 4 | 🟦spec.md§3.9 / 🟥 |
| POST | `/admin/staff/:id/approve` (manager) | 承認＋担当/チャネル/サイクル設定 | 4+ | 🟥★PM phase2-design.md§5 |
| GET/PUT/POST | `/question-sets` (manager) | グループ別設問セットの CRUD・版管理・ガードレール | 6 | 🟦spec.md§3.6 / 🟥 |
| POST | `/admin/skill-sheets/bulk` (manager) | 全員分生成→ZIP | 6 | 🟦spec.md§3.9 / 🟥 |
| POST | `/reports/:id/follow-up` | 薄い項目への追加質問生成（一度だけ・degrade 有） | 6 | 🟦report-quality / 🟥 |

---

## 4. データモデル（reference-mock/spec.md §4・phase1-plan.md・phase2-design.md §7）

### Phase 1 最小（🟦 phase1-plan.md をそのまま）

```
users(id, google_sub, email, name, role, group_id?, timezone, created_at)
reports(id, user_id, report_date, input_mode, raw_text, ai_summary_json, status, created_at)
```
- 🟦 `status`: `draft` / `confirmed`。**確定後は本文・要約を変えない**（spec.md §3.4・report-quality §5.3・不変ログ）。
- 🟦 `ai_summary_json`: `{ incidents[], achievements[], issues[], skills[] }`（Phase 1 は表示・保存のみ）。

### 全体（🟦 spec.md §4。Phase 2 以降で正規化・追加）

| エンティティ | 主な項目 | 役割 | フェーズ |
|---|---|---|---|
| USERS | id, email, name, role, group_id, timezone | ユーザー・ロール・所属グループ | 1 |
| REPORTS | id, user_id, report_date, input_mode, raw_text, confirmed_summary(JSON), status | 確定報告の不変ログ | 1 |
| PROJECTS | id, user_id, project_key, client_name, status, last_active_at | 案件マスター（突合キー） | 3 |
| REPORT_PROJECTS | report_id, project_id, contribution | 報告と案件の紐づけ | 3 |
| INCIDENTS | id, project_id, status, opened_by, resolved_by | インシデント状態（発生/対応中/解決） | 3 |
| SKILLS | id, name, category | 専門用語マスター（名寄せ） | 2/3 |
| REPORT_SKILLS | report_id, skill_id | スキル抽出・在庫の素 | 2/3 |
| MASTER_SUMMARIES | id, user_id, project_id, period, summary(JSON), reconciled_at | 突合済みマスター元データ | 3 |
| TEMPLATES | id, group_id, file_url, version, anchor_map | グループ別 Excel テンプレート | 2 |
| QUESTION_SETS | id, group_id, version, questions(JSON＋役割タグ) | グループ別設問テンプレート | 6 |
| GENERATED_SHEETS | id, user_id, template_id, file_url, filename, generated_at | 生成済みスキルシート（履歴） | 2 |
| NOTIFICATION_SETTINGS | id, user_id, remind_time, slack_enabled, email_enabled | 通知設定 | 4 |

🟥 `★source: PM` **報告サイクル・未報告/欠勤/報告漏れ管理の新規エンティティ**（チャネル／担当関係(主副)／
報告スケジュール(機会)と履行ステータス／欠勤申告／打刻イベント）は phase2-design.md §7 が「実装時に詳細設計」と
明記する未決。**Phase 2/4 の凍結対象**。現 `reports.status(draft/confirmed)` では未報告/欠勤を表現できない（§7）。

---

## 5. Summarizer の境界（reference-mock/spec.md §5・report-quality-design.md §8・CLAUDE.md）

🟦 AI 呼び出し（要約・粒度吟味・質問生成・要約再生成・スキルシート言い換え）は**すべて提供元非依存の
`Summarizer` 抽象化層の背後**で行う（原則2）。ドメイン層（service）に Claude/Gemini/Vertex の SDK・モデル名を書かない。

- 🟦 出力は**固定 JSON スキーマ**に縛る（原則3。自由文を解釈しない）。
- 🟦 **数値・事実を創作させない**。不足は空欄のまま（spec.md §5・report-quality §5.4）。
- 🟦 プロバイダ固有制約（例: Gemini の `response_schema`）は**プロバイダ実装側で吸収**し共通スキーマを汚さない（§10.8）。
- 🟦 **雑感（メンタル面）は AI 変換の対象から完全に除外**（spec.md §3.7・§6.2）。

🟥 `★source: PM` **Phase 1 の Summarizer は1プロバイダ実装**（phase1-plan.md）。境界の TypeScript インターフェース名・
メソッド形（`summarize(text): StructuredSummary` 等）は新規設計。理由: 参照モックは Python 前提でシグネチャを規定しない。

---

## 6. スコープ外の明示（reference-mock/phase1-plan.md「含まない」・各 phase）

🟦 **Phase 1 で作らない**: 音声入力/STT、通知（Slack/メール）、突合・マスター元データ、スキルシート(Excel)生成、
設問テンプレート、グループ別設定、ウェルビーイング設問、報告サイクル/未報告管理、AI追加質問。

🟦 **本システム全体でやらない（非ゴール）**:
- AI にメンタル状態を診断・点数化させる（spec.md §3.7）。
- 雑感をスコア化・ダッシュボードで監視的に扱う。
- AI に事実・数値を創作させる。
- 本番/実データの持ち込み（合成フィクスチャのみ・CLAUDE.md §1-6）。

---

## 7. 3層マッピング（ADR-0011・Express は構造を強制しない）

🟥 `★source: PM` 参照モックの FastAPI ルーターを Express の一方向3層へ写す。**逆流・飛び越しはカスタム lint で fail**。

```
router（HTTP・入出力の Zod 検証・422 整形）
  → service（ドメインロジック・認可境界の強制・Summarizer 呼び出し）
    → repository（Prisma・永続化のみ）
```

- 🟦 認可境界（所有者検証 `get_owned_report` 相当）は **service 層**で強制する（phase1-plan.md ステップ3・phase2-design.md §0）。
- 🟦 Summarizer 抽象化層は service から呼ぶ。repository は AI を知らない。
- `app.ts` が唯一の合成ルート。`express-async-errors` を1回だけ入れる（CLAUDE.md §6）。

---

## 8. 設計凍結ゲート（★source: PM の未解決一覧・ADR-0016）

**大バッチ上流に入る前に、下記を解決・必要なら ADR 化する。** これらは answer key を持たず、下流フェーズまで誤りが露見しない。

### spec.md §9・必要画面 §6 の決定待ち論点
1. スタッフの複数グループ所属を許すか。
2. 管理者の複数グループ兼任を許すか。
3. グループ移管時の過去報告・マスターデータの扱い。
4. 雑感の閲覧範囲・任意/非公開の詳細。
5. STT 方式の選定（Web Speech / サーバ STT）。
6. 要約モデルの選定（Claude / Gemini / Vertex）。
7. 突合の実行タイミング（同期／夜間バッチ）。
8. スキルシートプレビュー方式（PDF / HTML）。

### phase2-design.md §8 の未決（Phase 2+ 凍結）
9. system admin と super admin を分けるか統合するか。
10. 副担当に許す操作の線引き。
11. 承認待ち一覧を誰に見せるか／新規スタッフを誰が承認するか。
12. 本人が履行状況を閲覧できるか・異議申立て手段。
13. スタッフが締切時刻を後からずらせるか。
14. 遅延提出の累積換算の閾値。
15. 報告漏れ計上のばらつき抑止。

### report-quality-design.md §13 の未決（Phase 6 凍結）
16. ルールのしきい値（空・極端に短い）と対象カテゴリの初期値。
17. 生成質問と定型質問の優先順位・質問数上限。
18. 基準の解決順（グループ設定→全体デフォルト）。
19. 追加質問/回答・基準・状態のデータモデル。
20. degrade 詳細（縮退範囲・再来訪 UI・タイムアウト/再試行）。

### API/REST 設計（本書 §3・§7 が新規に決めたもの）
21. 全エンドポイントのパス・メソッド・ステータスコード（§3）。
22. Summarizer の TypeScript インターフェース形（§5）。
23. 3層マッピングの具体（§7）。

> **Phase 1 に必要な凍結項目は 6・21・22・23 と、認可の 4（雑感は Phase 1 スコープ外なので実質不要）**。
> Phase 2 以降の項目は各フェーズ着手前に解決すればよい（フェーズ順に凍結を進める）。

## 8.5 凍結解除ログ（PM／AIアーキ 決定・2026-07-15）

工程3 の残13本を承認可能にするため、下記を PM／AIアーキが決定した（source: PM）。各 spec に反映済み。

| 論点 | 決定 | 影響 spec |
|---|---|---|
| 外部副作用プロバイダのテスト扱い（新規） | **決定的フェイク/スタブに差し替え**。本物のキー・通信を CI に持ち込まない | slice-06, 16, (18) |
| 項目8 プレビュー方式 | **HTML 変換**（DL は元 xlsx）。MVP は軽量優先 | slice-09 |
| 項目7 突合タイミング | **確定のたび同期実行**。規模拡大時に夜間バッチへ切替可能な形 | slice-12 |
| 項目5 STT 方式 | **Web Speech API から**（差し替え可能な抽象層の裏。サーバ STT は後から） | slice-18 |
| 設問ガードレール（spec-local） | **必須ロール不足は公開をブロック**（警告のみにしない） | slice-19 |
| 一括 ZIP 未生成スタッフ | **スキップ＋ZIP に manifest 注記**（全体を止めない） | slice-21 |
| 項目4 雑感の入力・公開 | **任意入力＋本人非公開可**。AI 変換・シート反映からの完全除外は不変 | slice-20 |
| 項目11 承認主体・可視範囲 | **super admin が承認**し承認待ち一覧は super admin に見せる | slice-17 |
| 項目9,10,13,14,15 権限3軸細部 | **本バッチはスコープアウト**。最小ロール（staff/manager/メンタルケア担当）＋グループ単位に固定し、主副担当・個人単位担当・admin 細分化は **slice-24 permission-model** へ | slice-14, 20, 22 |
| 項目12 本人の履行状況閲覧 | **本人は read-only で閲覧可**。異議申立て手段は **slice-25 report-history-appeal** へ | slice-15 |
| 項目3 グループ移管時の過去データ | **履歴として保持**（元グループの不変履歴。新規報告から移管先へ） | slice-22 |
| 項目16-20 AI追加質問の詳細 | **「最初の一歩」（report-quality §12.1）で承認・段階送り**。しきい値は初期ゆるめ・実データ調整（着手時に仮値）。データモデル/degrade UI 詳細・管理画面・チーム別基準は **slice-26 ai-followup-advanced** へ | slice-23 |

> スコープアウト先の **slice-24/25/26** はレジストリに append 採番済み（backlog・番号不変・ADR-0013）。
> これらは「未定を消した」のではなく「**扱う場所を後続スライスに確定した**」。凍結ゲートの穴を残さない。
