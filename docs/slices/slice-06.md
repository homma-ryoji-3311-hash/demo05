# slice-06 auth-authz — Google OAuth ＋ 権限境界の強制

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。
> **リーダー記入待ち: §4 固有注意・§6 slice 固有。**
> ⚠️ 認証・認可を扱うスライス。`irreversible` ラベル相当（PM が diff を読む・憲法 §7）。

## 1. ゴール

Google OAuth でログインするとセッションが発行され users に upsert される。許可ドメイン外・招待外は拒否。未認証で保護 API を呼ぶと 401、他人のデータへのアクセスは 403（バックエンド強制）。S1 ログインからロール別ホームへ遷移し、未ログインでは保護画面に入れずログインへ誘導される。外部プロバイダは決定的フェイク seam 経由（実鍵は `.env` のみ）。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/auth/auth.api.spec.ts` | backend |
| UI | `acceptance/auth/auth.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `auth.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-06.md`（approved: true）
- AC: AC-1 callback 成功でセッション＋user upsert／AC-2 許可外ドメイン・招待外は拒否（403）／AC-3 未認証の保護 API=401／AC-4 他人データ=403

## 3. 触ってよいファイル範囲

- `apps/service/src/auth/`
  - `use-case/authGoogleCallback.ts` `use-case/getMe.ts`
  - `domain/model/user.ts` `domain/interface/userRepository.ts` `domain/error/authErrors.ts`
  - `infra/repository/*UserRepository.ts`
  - `interfaceAdapter/api/route/authRoute.ts` `interfaceAdapter/api/controller/authController.ts`
- `apps/service/src/common/interfaceAdapter/api/auth.ts`（認証ミドルウェア・401/403 の強制）
- `apps/web/src/features/auth/`（S1 ログイン・`RequireAuth`・セッション）
- 上記範囲の unit テスト
- **範囲外**：`acceptance/` `reference-mock/` `docs/` `.claude/` ／ reports（slice-01〜05）／ home（slice-07）／ 実プロバイダ鍵（`.env` のみ・差分に出さない）／ DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-06 auth-authz を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
実 OAuth クライアントシークレットは .env のみで扱い差分・フィクスチャに出さない。外部プロバイダは決定的フェイク seam。許可外ドメインは 403・未認証の保護 API は 401。
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
- 実 OAuth クライアントシークレット・実通信の持ち込み（`.env` のみ・フィクスチャ/差分に出さない・憲法 §1-7）
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- reports（slice-01〜05）/ home（slice-07）の領域に着手しない（認可 403 強制の正本は本スライス）
