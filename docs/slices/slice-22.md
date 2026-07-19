# slice-22 group-settings — グループ別設定（設定駆動）

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-22.md`（approved 2026-07-19）。依存: slice-19。フェーズ: 6。
> 振る舞いの正本: `spec.md §2.3`（一元化＋グループ別設定・設定駆動）・`report-quality-design §7.4`（翌日反映）。CLAUDE.md 原則7。

## 1. ゴール

システムは1つに一元化し、**グループ固有部分（設問セット版・シート様式・タブ表示）だけを設定データで切り替える**（全体機能は共通・AC-1）。**コードに分岐を埋めず、設定追加だけで新グループを利用可能にする**（AC-2）。**設定変更は翌日以降の報告に適用**（`effective_from`）し、**確定済み過去報告は作成時点の設定を保持したまま不変**（AC-3）。**グループ設定の編集は担当 manager に限定**（担当外 manager・staff は `403`・AC-4）。**グループ移管後も過去の確定報告は元グループの不変履歴**として残り、移管先へは新規報告から引き継がれる（AC-5・原則6）。管理者コンソール（S8）内に設定編集領域を置く。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/admin/group-settings.api.spec.ts` | backend |
| UI | `acceptance/admin/group-settings.ui.spec.ts` | **backend ＋ frontend** |

- golden: 撮影不可（参照モックに画面なし）→ `*.ui.spec.ts` の DOM アサーション（ADR-0018）。
- 仕様表: `docs/spec/slice-22.md`（approved・AC-1〜5＋画面要件）
- AC: AC-1 設定でグループ固有部分切替／AC-2 設定追加だけで新グループ／AC-3 翌日反映・過去不変／AC-4 担当 manager 限定／AC-5 移管後も過去は元グループ
- オラクル parity: `tools/reference-mock-server/server.mjs`（`groupSettings`・`groupManagers`・`reportSnapshots`・`GET`/`PUT /groups/:id/settings`・`GET /report-snapshots/:id`・`POST /admin/staff/:id/transfer`）と HTTP 等価に。`403`（担当外）・`effective_from`（翌日）・過去 snapshot 不変を一致。

## 3. 触ってよいファイル範囲

- `apps/service/src/group-settings/`（新規モジュール）
  - `domain/model/groupSetting.ts`（グループ固有部分・翌日反映の `effective_from`・過去不変）
  - `domain/interface/groupSettingRepository.ts`（設定の read/write ポート）
  - `domain/interface/groupManagerPolicy.ts`（編集担当 manager の解決・cross-module。担当範囲の正確な解決は slice-24）
  - `infra/repository/{inMemory,prisma}GroupSettingRepository.ts`（実装＋seed＝オラクル parity・prisma は未マイグレーションで未配線 throw）
  - `use-case/{getGroupSetting,updateGroupSetting,transferStaffGroup}.ts`（過去報告スナップショットは変えない）
  - `interfaceAdapter/api/controller/groupSettingController.ts`／`interfaceAdapter/api/route/groupSettingRoute.ts`
- `apps/service/src/app.ts`（router＋groupManagerPolicy の配線＋seed）
- `apps/web/src/features/admin/`（S8 内にグループ設定編集領域を足す・専用画面は新設しない）
- `apps/web/src/router.tsx`（`/admin/group-settings` を `RequireAuth` で保護ルート追加）
- 上記範囲の unit テスト
- **範囲外**：他 feature／確定報告の本体（reports は不変・過去 snapshot を書き換えない）／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／設問セット編集そのもの（slice-19）／担当範囲の権限3軸解決（slice-24）

> 構造規約（ADR-0011）: `router → controller → use-case → repository`。**設定駆動**（グループ固有部分は設定データで解決・コード分岐を足さない）・**翌日反映**（`effective_from`）・**過去不変**（確定報告スナップショットは移管・設定変更で変えない）。編集は担当 manager 限定（use-case で強制）。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-22 group-settings を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「グループ固有部分は設定データで切替（コード分岐を足さない・新グループは設定追加だけで利用可）。設定変更は effective_from=翌日以降、確定済み過去報告は作成時点の設定を保持し不変。移管しても過去報告は元グループの不変履歴（新規報告から移管先）。編集は担当 manager のみ（担当外/staff は 403）。オラクルと等価」>
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden 撮影不可 → **`*.ui.spec.ts` の DOM アサーションが緑**（ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only`）
4. シークレット・PII が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- **グループ固有部分をコード分岐で実装すること（設定駆動を崩す）・過去報告へ新設定を遡及適用すること・移管で過去報告の group を書き換えること。**
- **設問セット編集（slice-19）／担当範囲の権限3軸解決（slice-24）に着手しない。**
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-19 question-template／slice-24 permission-model）>
```
