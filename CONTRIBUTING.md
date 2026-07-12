# コントリビューションガイド

staff-report への開発参加時のルールをまとめる。詳細な環境構築手順は [`docs/環境構築.md`](docs/環境構築.md)、全体構成は [`README.md`](README.md) を参照。

## 前提ツール

- Node.js 22 以上
- pnpm 10 以上
- PostgreSQL（Docker またはローカルインストール）

## セットアップ

```sh
make setup        # Docker で PostgreSQL を動かす場合
# または
make setup-local  # PC にインストールした PostgreSQL を使う場合
```

`make setup` はツール確認 → `pnpm install` → `.env` 作成 → DB 起動 → マイグレーションまで一括で行う。`pnpm install` 時に Git フック（lefthook）も自動でインストールされる。

## 開発フロー

```sh
pnpm dev          # web (http://localhost:5173) と api (http://localhost:3000) を同時起動
```

web の `/api/*` は Vite proxy 経由で api に転送される。

コミット前に、変更範囲に応じて以下を通しておく:

```sh
pnpm typecheck    # 型チェック（全パッケージ）
pnpm lint         # ESLint（全パッケージ）
pnpm test         # テスト（全パッケージ、Vitest）
pnpm format       # Prettier 整形
```

特定パッケージだけ動かす場合は `pnpm --filter @staff-report/web <script>` / `pnpm --filter @staff-report/api <script>`。

## ブランチ

- `main` から作業ブランチを切る。`main` へ直接コミットせず、変更は Pull Request 経由でマージする。
- 形式: `<type>/<短い説明>`（例: `feature/greeting-screen`, `fix/auth-401`）。
  - **ブランチ名は半角英数字とハイフンのみ。日本語は使わない**（説明部分は英語 kebab-case）。

## Jira 連携

タスク管理は Jira Cloud（プロジェクトキー `SRP`）で行う。GitHub とは「GitHub for Jira」で連携している。

- **コミット / PR タイトルに課題キーを必須にしている**（commitlint・CI で強制）: subject の**末尾に `[SRP-<番号>]`**（例: `feat(web): greeting 画面を追加 [SRP-2]`）。無い／先頭に置く／括弧違い（`(SRP-2)`）は弾かれる。
- これにより該当 Jira 課題の「開発」欄にコミット・PR が自動表示される。
- ブランチ名への課題キーは任意（入れると紐づきがより確実になる）。

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従う。`commit-msg` フックで [commitlint](commitlint.config.ts) が検証し、違反するとコミットできない。

形式:

```
<type>(<scope>): <subject>
```

- **type**（必須）: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- **scope**（必須）: `web` / `service` / `project` のいずれか
  - `web`: フロントエンド（`apps/web`）
  - `service`: バックエンド（`apps/service`）
  - `project`: リポジトリ全体・複数パッケージ横断・ルート設定・ドキュメントなど
- **subject**（必須）: 変更内容の要約。**日本語（ひらがな・カタカナ・漢字）を必ず含める**（`ESLint` / `OpenAPI` など英語の技術用語の混在は可）。空にしない。

例:

```
feat(web): greeting 画面を追加
fix(service): 認証ミドルウェアの 401 判定を修正
docs(project): CONTRIBUTING を追加
```

## Git フック（lefthook）

`pnpm install` で自動インストールされる。

| フック       | 内容                                                               |
| ------------ | ------------------------------------------------------------------ |
| `pre-commit` | ステージ済みファイルに secretlint / prettier --check / ESLint      |
| `commit-msg` | commitlint（上記のコミットメッセージ規約）                         |
| `pre-push`   | `apps/web`・`apps/service` の typecheck と `apps/service` のテスト |

## コーディング規約

### 共通

- TypeScript は ESM（`"type": "module"`）。
- 整形は Prettier、静的解析は ESLint（`@staff-report/eslint-config`）に従う。カスタムのアーキテクチャルールも ESLint で強制される。

### バックエンド（`apps/service`）

- クリーンアーキテクチャ。依存の向きは `interfaceAdapter → usecases → domain` ← `infrastructure`。`domain` は他レイヤーに依存しない。
- ドメイン間の直接 import は禁止（`architecture/no-cross-feature-import`）。共有は `shared/` に切り出す。
- ビジネスルール違反は `domain/error/` の業務固有エラークラスで throw し、`interfaceAdapter/api/` の変換関数で `HttpException` に変換する（`architecture/no-raw-error-throw` ほかで強制）。
- テストは `__tests__/` にまとめる。Integration Test はモック禁止で InMemory 実装を使う。

### フロントエンド（`apps/web`）

- SPA。機能単位は `src/features/<feature>/`、フィーチャー横断の共通部品は `src/common/` に置く。
- ドメイン間の直接 import は禁止（`architecture/no-cross-feature-import`）。共有は `common/` 経由。`common` はどのフィーチャーにも依存しない。
- API クライアント（型・React Query hooks）は service の OpenAPI から orval で生成する。**契約を変えたら再生成する**:

  ```sh
  make gen-api    # service の openapi.json 出力 → orval で web のクライアント再生成
  ```

  生成物（`apps/web/src/common/api/generated/`）は手で編集しない。

- テストは `src/__test__/` に集約する（フィーチャーごとにサブディレクトリ、例 `src/__test__/greeting/GreetingCard.test.tsx`）。API は MSW でモックする。

## データベース

PostgreSQL 17 + Prisma。スキーマは `apps/service/prisma/schema.prisma`。マイグレーションやクライアント生成は `pnpm --filter @staff-report/api db:migrate` / `db:generate` など（詳細は README）。

## Pull Request

- タイトルはコミットメッセージ規約に準ずる（PR タイトルは CI で commitlint 検証される）。
- 関連する Jira 課題キー `SRP-<番号>` を PR タイトルまたは本文に含める（テンプレートの「関連課題」欄）。
- `pnpm typecheck` / `pnpm lint` / `pnpm test` がすべて通ることを確認してから出す（`pre-push` フック・CI でも検証される）。
- 関連する仕様・設計ドキュメントがあればリンクする。
