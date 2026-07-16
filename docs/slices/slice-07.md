# slice-07 staff-home — スタッフ用ホーム

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。
> **リーダー記入待ち: §4 固有注意・§6 slice 固有。**

## 1. ゴール

`GET /home` で今日の報告状況（下書きあり=draft_exists 等）を返し、未確定下書きへの導線と報告入力（S3）への導線を表示する。S2 スタッフ用ホームで状態が色だけでなくテキストでも表現される（非機能要件）。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/home/home.api.spec.ts` | backend |
| UI | `acceptance/home/home.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `home.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-07.md`（approved: true）
- AC: AC-1 今日の報告状況（下書きあれば today_status=draft_exists）／AC-2 未確定下書きへの導線／AC-3 報告入力（S3）への導線

## 3. 触ってよいファイル範囲

- `apps/service/src/home/`
  - `use-case/getHome.ts`
  - `domain/interface/reportSummaryReader.ts`（reports の read 専用ポート・reports 本体は触らない）
  - `interfaceAdapter/api/route/homeRoute.ts` `interfaceAdapter/api/controller/homeController.ts`
- `apps/web/src/features/home/`（S2 スタッフ用ホーム・導線）
- 上記範囲の unit テスト
- **範囲外**：`acceptance/` `reference-mock/` `docs/` `.claude/` ／ reports 本体（slice-01〜05。参照は read ポート経由のみ）／ 認証（slice-06）／ DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-07 staff-home を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
reports 本体は触らず read ポート（reportSummaryReader）経由でのみ参照する。状態は色だけでなくテキストでも表現する（非機能要件）。
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
- reports 本体（slice-01〜05）/ auth（slice-06）の領域に着手しない
