---
slice: slice-17-staff-approval
approved: true
---

# slice-17 staff-approval — 承認待ち／承認・担当紐付け

> 振る舞いの正本: `reference-mock/phase2-design.md §5`（登録・承認フロー）。REST/コードは `docs/design/overview.md §3`（`POST /admin/staff/:id/approve` manager）。依存: slice-14。
> **スコープ**: 新規スタッフの deny-by-default（承認待ち）と、super admin による承認＋担当紐付け（主/副・チャネル・報告サイクル）。
> **PM 決定（2026-07-15・source: PM）**:
> - 承認主体・可視範囲（項目11・§5 未決③・§8-3）＝**super admin が承認し、承認待ち一覧は super admin に見せる**（overview §8.5）。理由: 新規スタッフはまだ誰の担当でもなく、承認は組織横断の権限。よって本スライスは「super admin が承認する」ことと「承認で担当（主/副）・チャネル・報告サイクルを設定できる」ことまでを確定する。
> - 副担当に許す操作の正確な線引き（項目10・§3 未決②）は **slice-24 permission-model で扱う（PM 決定 2026-07-15）**。本スライスは承認時に主/副の属性を**設定できる**ことまでを対象にし、主/副担当の操作差そのものは扱わない。
> - system admin と super admin を分けるか統合するか（項目9・§1 未決①）は権限3軸細部として **slice-24 permission-model で扱う（PM 決定 2026-07-15）**。

## AC-1 未承認スタッフは deny-by-default で何もできない（バックエンド強制）

- source: reference-mock        # phase2-design.md §5「承認されるまで承認待ち画面で止まる／報告入力を含め何もできない（deny-by-default）」／拒否コードは ★PM
- 理由（コード）: 参照モックはコードを規定しない。承認前の保護 API 呼び出しは `403`（認証は済むが認可されない）。
- **Given** Google ログインは済んだが未承認の新規スタッフ
- **When** 報告入力など保護 API を呼ぶ
- **Then** `403` が返り、報告フローに入れない（画面制御だけでなくバックエンドで強制）

## AC-2 super admin の承認で担当（主/副）・チャネル・報告サイクルが設定される

- source: PM        # ★承認主体＝super admin は overview §8.5 の PM 決定（2026-07-15）。REST/コードは overview §3
- 理由: 参照モックは承認主体を規定しない。承認は組織横断の権限のため super admin に確定（主/副担当の操作差の細部は slice-24 へ）。
- **Given** 承認待ちの新規スタッフ
- **When** super admin が `POST /admin/staff/:id/approve` を呼び、担当（主担当/副担当）・チャネル・報告サイクルを指定する
- **Then** `200` が返り、スタッフに担当関係・チャネル・報告サイクルが紐づく

## AC-3 承認済みになると deny-by-default が解除される

- source: reference-mock        # phase2-design.md §5（承認後に稼働可能になる。§6.3「承認済み・稼働中アカウント」が報告義務の前提）
- **Given** AC-2 で承認されたスタッフ
- **When** 報告入力など保護 API を呼ぶ
- **Then** 承認待ちによる拒否は解除され、報告フローに入れる

## AC-4 承認待ちスタッフ一覧は super admin が取得できる

- source: PM        # ★可視範囲＝super admin は overview §8.5 の PM 決定（2026-07-15）。列挙自体は phase2-design.md §5
- 理由: 参照モックは可視範囲を規定しない。承認主体＝super admin に合わせ、承認待ち一覧の宛先も super admin に確定。
- **Given** 承認待ちの新規スタッフが存在する
- **When** super admin が承認待ち一覧を取得する
- **Then** 未承認スタッフが一覧に現れ、super admin から承認操作の導線がある（super admin 以外のロールには一覧を見せない）

## 画面要件

- 対象画面: S12 承認待ち／承認・担当紐付け（対象: staff/manager。overview §2 で ★PM）
- golden 撮影: 可
- **UI-AC（source: PM）**
  - 未承認スタッフ側には「承認待ち」画面が表示され、報告入力等の機能へ進めない。
  - super admin の承認・担当紐付け画面で、担当（主/副）・チャネル・報告サイクルを指定して承認できる。
  - 承認待ちスタッフ一覧は super admin に表示され、各行から承認へ進める（一覧の可視範囲＝super admin・overview §8.5 の PM 決定。主/副担当の操作差の細部は slice-24 permission-model で扱う）。

## 合成フィクスチャ（PM 所有）

**本番/実データは一切入れない**（憲法 §1-6）。TZ は保存 UTC・表示/判定ローカル。

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| newStaff.email | L1 | `newstaff@example.test` | 承認待ちの新規スタッフ |
| newStaff.status | L0 | `pending → active` | 承認前後の状態遷移 |
| manager.id | L0 | `m_0001` | 承認を行う管理者 |
| approve.assignment | L0 | `{ role: primary }` / `{ role: secondary }` | 主/副担当の属性設定 |
| approve.channel | L0 | `SES` | チャネル（HR/SES/マーケ 等） |
| approve.cycle | L0 | `daily` | 報告サイクル（slice-15 と整合） |
