# slice-08 skillsheet-generate — スキルシート生成

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。

## 1. ゴール

`POST /skill-sheets` で、合成マスター元データを「データ組立 → AI言い換え（`sheetParaphraser` 抽象化・数値創作なし）→ テンプレート反映（メタ）」の3フェーズで生成し、`201` と構造化 content・`filename`（`[名]_[ファイル名]_YYYYMMDD.xlsx`）・署名付き `file_url` を返す。再生成は新 id（非破壊・履歴）。他人対象は `403`・未認証は `401`。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/skillsheets/generate.api.spec.ts` | backend |
| UI | **なし（画面なし）** | — |

- golden: **撮影不可（画面なし）**。完了判定は API 受け入れテスト（実 HTTP）が緑（ADR-0018）。
- 仕様表: `docs/spec/slice-08.md`（approved）
- AC: AC-1 3フェーズ生成＋構造化 content ／ AC-2 数値創作なし ／ AC-3 filename 形式 ／ AC-4 再生成は新 id/file_url ／ AC-5 認可（他人403・未認証401）

> 画面なしは仕様表 §画面要件に理由つきで明記済み（閲覧 UI は slice-09・管理者導線は後続）。§3 に `apps/web/` は挙げない。

## 3. 触ってよいファイル範囲

- `apps/service/src/skillsheets/`
  - `use-case/generateSkillSheet.ts`
  - `domain/interface/masterReader.ts`（合成マスターの read ポート）
  - `domain/interface/skillSheetRepository.ts`（生成物の保存・履歴・非破壊）
  - `domain/interface/sheetParaphraser.ts`（**AI言い換え抽象化＝プロバイダ非依存・Summarizer 型**）
  - `domain/model/skillSheet.ts`
  - `infra/repository/{inMemory,prisma}SkillSheetRepository.ts` ／ `infra/paraphraser/fakeSheetParaphraser.ts`
  - `interfaceAdapter/api/controller/skillSheetController.ts` ／ `route/skillSheetRoute.ts`
- `apps/service/src/app.ts`（合成ルート配線）
- 上記範囲の unit テスト
- **範囲外**：`apps/web/`（画面なし）／`acceptance/` `reference-mock/` `docs/` `.claude/`／reports（slice-01〜05）・auth（slice-06）本体／DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-08 skillsheet-generate を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります（api.spec.ts のみ・画面なし）。
  まず現状の赤を確認してください（当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
AI言い換えは sheetParaphraser 抽象化層を必ず経由する（プロバイダ非依存・CLAUDE.md §5）。マスターに無い数値を創作しない（AC-2）。バリデーション失敗は 422。
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**画面なしのため `*.api.spec.ts` のみ**（ADR-0018）
2. 画面なし → golden 該当なし（完了判定①で代替）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only` と突き合わせ）
4. シークレット・PII が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更（特に `apps/web/`＝画面なし）
- 受け入れテスト・`reference-mock/`・`docs/` の変更
- **マスターに無い数値を創作すること**（AC-2・要約/言い換えは抽出のみ）
- reports（slice-01〜05）/ auth（slice-06）本体、閲覧 UI（slice-09）・テンプレート管理（slice-10）への着手
