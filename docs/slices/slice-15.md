# slice-15 report-cycle-status — 報告サイクル・締切・報告ステータス（5種）

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-15.md`（approved 2026-07-19）。依存: slice-14。フェーズ: 4。
> **中心**: 5 ステータス（提出済み/遅延提出/未報告/欠勤/報告漏れ）の**判定セマンティクスと遷移**を固定する（phase2-design §6）。
> **重要（仕様表の明示）**: REST パス・エンティティ・スケジュール（機会）生成の詳細は **phase2-design §7 に従い実装時の詳細設計**。URL を発明せず、状態の定義と遷移を実装する。固定時刻型の締切のみ対象。
> **後続へ送る**: 退勤連動締切・累積換算の閾値・報告漏れ計上のばらつき抑止・個人単位担当は slice-24／異議申立ては slice-25。

## 1. ゴール

報告サイクル（日報/週報/隔週/月報・スタッフごとに異なる・固定時刻型の締切）を管理者が設定でき、報告義務の各「機会」に対して 5 ステータスを判定する：**提出済み**（締切前確定）・**遅延提出**（締切後確定）・**未報告**（締切超過・未確定＝自動検知の中立・評価に効かない）・**報告漏れ**（管理者が実態確認の上で計上して初めて確定・評価に効く）・**欠勤**（スタッフ申告＋管理者承認・消去でなくステータスとして残す・評価対象外）。**本人は自分の履行状況を read-only で閲覧**でき、計上・承認などの操作はできない（AC-6）。締切判定はユーザーのローカル時刻（保存 UTC）。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/admin/report-cycle-status.api.spec.ts` | backend |
| UI | `acceptance/admin/report-cycle-status.ui.spec.ts` | **backend ＋ frontend** |

- golden: **撮影不可**（判定セマンティクスが中心・画面詳細は §7 実装時設計）。完了判定は `*.ui.spec.ts` の DOM アサーション（ADR-0008・0018）。
- 仕様表: `docs/spec/slice-15.md`（approved・AC-1〜6＋画面要件）
- AC: AC-1 サイクル設定（スタッフ別）／AC-2 提出済み・遅延提出／AC-3 未報告（中立）／AC-4 報告漏れ（管理者計上）／AC-5 欠勤（申告＋承認）／AC-6 本人 read-only 閲覧
- オラクル parity: `tools/reference-mock-server/server.mjs`（`opportunityStatus` 純関数・`reportCycles`・機会 seed・本人 read-only／管理者 mutate）と**状態遷移が等価**であること。**URL 形状ではなく状態遷移を合わせる**（§7 で REST は詳細設計しうる）。ステータス語彙: `submitted`/`late`/`missing`/`unreported_flagged`/`absent`。

## 3. 触ってよいファイル範囲

- `apps/service/src/report-status/`（新規モジュール）
  - `domain/model/opportunity.ts`（機会・締切・5 ステータスの純関数判定〔提出済み/遅延提出/未報告/欠勤/報告漏れ〕・締切判定はローカル時刻）
  - `domain/model/reportCycle.ts`（サイクル種別 `daily/weekly/biweekly/monthly` の検証・不正は 422）
  - `domain/interface/reportStatusRepository.ts`（サイクル・機会の read/write ポート）
  - `domain/interface/actorContextReader.ts`（呼び出しユーザーのロール〔本人=read-only／manager=計上・承認〕を読む cross-module ポート）
  - `infra/repository/{inMemory,prisma}ReportStatusRepository.ts`（実装＋seed＝オラクル parity・prisma は未マイグレーションのため未配線 throw）
  - `use-case/setReportCycle.ts`／`use-case/viewMyReportStatus.ts`／`use-case/flagMissing.ts`／`use-case/approveAbsence.ts`
  - `interfaceAdapter/api/controller/reportStatusController.ts`
  - `interfaceAdapter/api/route/reportStatusRoute.ts`（**REST 形状は phase2-design §7 の詳細設計に従う。オラクルの URL は semantics fixture**）
- `apps/service/src/app.ts`（router を `requireAuth` 付きで配線＋repo/seed 配線）
- `apps/web/src/features/report-status/`（新規: 本人の履行状況を read-only で表示するコンポーネント＋api client）
- `apps/web/src/features/reports/routes/ReportListPage.tsx`（**本人の報告履歴 `/reports` に履行状況を read-only で載せる面**。専用の重い画面は新設しない・仕様表画面要件）
- 上記範囲の unit テスト
- **範囲外**：他 feature（skillsheets・templates・home・auth 本体）／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／**退勤連動締切・累積換算閾値・個人単位担当（slice-24）／異議申立て（slice-25）／管理者向け新規画面**

> 構造規約（ADR-0011）: `router → controller → use-case → repository` の一方向。ロール差（本人 read-only／manager 計上・承認）は use-case/service 層で強制。**「未報告→報告漏れ」は自動でなく管理者の明示操作**、**欠勤は申告＋承認**——人間の確認を一枚かませる判定を壊さない。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-15 report-cycle-status を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「5 ステータスは純関数で判定（提出済み=締切前確定/遅延提出=締切後確定/未報告=締切超過未確定の中立/報告漏れ=管理者が計上して初めて確定/欠勤=申告+承認）。未報告→報告漏れは自動でなく管理者操作、本人は read-only（計上・承認は 403）。REST 形状は phase2-design §7 の詳細設計——オラクルとは状態遷移を合わせる（URL に依存しすぎない）。締切判定はローカル時刻」>
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden 撮影不可 → **`*.ui.spec.ts` の DOM アサーションが緑**で代替（ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only` と突き合わせ）
4. シークレット・PII が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更（＝仕様と answer key）
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- **判定の骨格を崩さないこと**: 未報告は自動検知の中立（自動で報告漏れにしない）／報告漏れは管理者が計上して初めて確定／欠勤は申告＋承認で付与し消去しない／本人は read-only。
- **退勤連動締切・累積換算の閾値・報告漏れ計上のばらつき抑止・個人単位担当（slice-24）／異議申立て（slice-25）／管理者向け新規画面に着手しない。**
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-16 slack-reminder／slice-17 staff-approval／slice-24 permission-model）>
```
