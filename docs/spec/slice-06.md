---
slice: slice-06-auth-authz
approved: true
---

# slice-06 auth-authz — Google OAuth ＋ 権限境界の強制

> 振る舞いの正本: `reference-mock/spec.md §3.1・§6.1` / `reference-mock/phase1-plan.md` ステップ3。
> REST/コードは `docs/design/overview.md §3`。依存: slice-01。
> **決定（PM・2026-07-15）**: OAuth の実プロバイダ呼び出しは受け入れテストで**決定的フェイク/スタブに差し替える**。
> 本物の client secret・実通信を CI に持ち込まない（`Summarizer` と同じく提供元非依存の抽象層の背後でフェイクを差す）。
> source: PM。理由: 参照モックは外部プロバイダのテスト扱いを規定しない＝新規決定（overview §8.5 凍結解除ログ）。テスト方式の決定のため AC 化しない。

## AC-1 Google OAuth でログインするとセッションが発行され users に upsert される

- source: reference-mock        # spec.md §3.1・phase1 ステップ3
- **Given** 許可ドメインの GWS アカウント
- **When** OAuth コールバックを完了する
- **Then** users に upsert され（role 付与）、セッション/トークンが発行される

## AC-2 許可ドメイン外・招待外のユーザーはログインできない

- source: reference-mock        # spec.md §3.1「許可ドメイン/招待制でホワイトリスト」
- **Given** 許可ドメイン外のアカウント
- **When** ログインを試みる
- **Then** ログインが拒否され、アプリのセッションは発行されない（拒否コードは ★PM で確定）

## AC-3 未認証で保護 API を呼ぶと 401 になる

- source: PM        # ★コード 401 は overview §3 の新規決定
- 理由: 参照モックはコードを規定しない。セッション無しの保護 API は `401`。
- **Given** セッションを持たないクライアント
- **When** `GET /reports` など保護 API を呼ぶ
- **Then** `401` が返る

## AC-4 他人のデータへのアクセスは 403 になる（バックエンド強制）

- source: reference-mock        # phase1 ステップ3 DoD「他人の report_id は 403」／コードは ★PM
- **Given** ログイン済みスタッフ A
- **When** スタッフ B の `report_id` にアクセスする
- **Then** `403` が返る（画面表示の出し分けだけでなくバックエンドで強制）

## 画面要件

- 対象画面: S1 ログイン
- golden 撮影: 可（ログイン画面）
- **UI-AC（source: PM）**
  - ログインボタンからロール別ホームへ遷移する。
  - 未ログインでは保護画面（報告入力等）に入れずログインへ誘導される。

## 合成フィクスチャ（PM 所有）

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| allowed_domain | L0 | `example.test` | 許可ドメイン設定 |
| staffA.email | L1 | `staffA@example.test` | — |
| staffB.email | L1 | `staffB@example.test` | 403 検証用 |
| outsider.email | L1 | `outsider@other.test` | 許可外 |

> OAuth の秘密（client secret 等）は `.env` のみで扱い、フィクスチャ・差分に出さない（憲法 §1-7）。
