# slice-04 report-list — 自分の報告一覧・詳細

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。
> **リーダー記入待ち: §4 固有注意・§6 slice 固有。**

## 1. ゴール

`GET /reports` で自分の報告一覧を、`GET /reports/:id` で本文と確定要約を含む詳細を取得できる（200）。他人の報告は 403。S5 一覧に日付・状況（下書き/確定）がテキスト表示され、行を開くと本文と確定要約の詳細が表示される。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/list.api.spec.ts` | backend |
| UI | `acceptance/reports/list.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `list.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-04.md`（approved: true）
- AC: AC-1 自分の報告のみ一覧（200）／AC-2 詳細に本文＋確定要約（200）／AC-3 他人の報告=403

## 3. 触ってよいファイル範囲

- `apps/service/src/reports/`
  - `use-case/listReports.ts` `use-case/getReport.ts` `use-case/loadOwnedReport.ts`（所有者境界）
  - `domain/interface/reportRepository.ts`（一覧・取得の read）
  - `interfaceAdapter/api/route/reportRoute.ts` `interfaceAdapter/api/controller/reportController.ts`（GET /reports・GET /reports/:id）
- `apps/web/src/features/reports/`（S5 一覧・詳細 UI）
- 上記範囲の unit テスト
- **範囲外**：`acceptance/` `reference-mock/` `docs/` `.claude/` ／ 作成・更新（slice-01）／ 確定（slice-03）／ 認証（slice-06。403 の強制自体は認証層に依存するが本スライスは read 経路のみ）／ DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-04 report-list を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
他人の報告は 403（所有者境界は loadOwnedReport で強制）。一覧・詳細は自分の報告のみを返す。
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden スクリーンショット差分が閾値内。**撮影不可のスライスは `*.ui.spec.ts` の DOM アサーションが緑**（ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only` と突き合わせ）
4. シークレット・PII が出力・差分に無い

> 3 は「緑」と「指示書 §1 のゴール文」の乖離を検知するための判定である（ADR-0018）。
> 触らずに緑になったなら、**実装ではなくテストか指示書が間違っている**。上流へ返す。

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更（＝仕様と answer key）
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- slice-01（作成/更新）/ slice-03（確定）の領域に着手しない
