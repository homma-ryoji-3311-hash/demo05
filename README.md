# staff-report

業務報告システム

- 業務報告入力 → AIが整形 → ユーザーが確認し修正 → 保存
- 蓄積された業務報告を元にスキルシート生成
- 推奨案件閲覧希望 → 推奨案件生成 → 営業担当が確認の上で開示可能か判定 → 推奨案件をエンジニアに提示 or 拒否

## 構成

pnpm workspace のモノレポ

```
apps/
├── web/       # フロントエンド (React + Vite + TypeScript)
└── service/   # バックエンド (Express + TypeScript)
```

### バックエンドの構成 (`apps/service/src/`)

ドメインごとにクリーンアーキテクチャの層を持つ

```
report/                    # ドメイン単位（業務報告）
├── domain/
│   ├── model/             # エンティティ（XxxDomainEntity、依存なし）
│   ├── error/             # 業務固有のドメインエラー（1クラス1ファイル）
│   └── repository/        # リポジトリインターフェース
├── use-case/              # ユースケース（domainのみに依存）
├── infra/
│   └── repository/        # リポジトリ具象クラス
└── interfaceAdapter/      # インバウンドのアダプター（外部からの受付）
    └── api/
        ├── controller/    # HTTP ⇔ ユースケースの変換
        ├── route/         # HTTPを該当するControllerに割り振り
        └── reportHttpException.ts  # ドメインエラー → HttpException 変換

shared/                    # フィーチャー横断の共通部品
├── config/                # 環境変数 (zodで検証)
└── interfaceAdapter/
    └── api/
        ├── httpException.ts  # HTTPレスポンスに変換可能な例外
        ├── middlewares/   # error-handler など
        └── route/         # health など

app.ts                     # コンポジションルート（依存の組み立て）
main.ts                    # エントリポイント
```

依存の向きは `interfaceAdapter → usecases → domain` ← `infrastructure`。
domain は他レイヤーに依存しない。フィーチャー間の直接importは禁止
共有したいものは `shared/` に切り出す

### エラーハンドリング

1. ビジネスルール違反は、フィーチャーの `domain/error/` に定義した**業務固有のエラークラス**（`Error` を直接extends、1クラス1ファイル、`this.name` 設定）でthrowする
2. フィーチャーの `interfaceAdapter/api/` の変換関数（例: `toReportHttpException`）がドメインエラーを `HttpException(status, message)` に変換する。未知のエラーはここでログに残し、内部情報を漏らさず500にする
3. `shared` の `error-handler` ミドルウェアは変換済みの `HttpException` をレスポンスとして送出するだけ

この方針は ESLint（`architecture/no-raw-error-throw`, `architecture/error-naming-convention`）で強制される。

### テスト

テストファイルは `__tests__/` ディレクトリにまとめる。

- 単体テスト: テスト対象の近くの `__tests__/` 内（例: `src/report/domain/model/__tests__/report.test.ts`）
- Integration Test: `__tests__/integration/` 内。モック禁止（`architecture/no-vitest-mock-in-integration`）、InMemory実装を使う

### フロントエンドの構成 (`apps/web/src/`)

```
features/                  # 機能単位のフィーチャーはすべてここに置く
└── greeting/              # フィーチャー単位
    ├── api/               # 生成 hook をラップするフィーチャー内 API
    ├── components/        # 表示コンポーネント
    ├── routes/            # 画面（ページ）
    └── index.ts           # 公開境界（バレル）

common/                    # フィーチャー横断の共通部品
├── api/
│   ├── client.ts          # 全 API が通る fetch mutator（認証差し込み口）
│   └── generated/         # orval 生成物（型 + React Query hooks、手編集しない）
├── components/ui/         # shadcn/ui コンポーネント
└── lib/                   # cn() など

__test__/                  # テストとセットアップをここに集約（フィーチャーごとにサブディレクトリ）
├── setup.ts               # MSW サーバ等の共通セットアップ
└── greeting/              # フィーチャー単位のテスト
main.tsx / providers.tsx / router.tsx   # 配線（コンポジションルート相当）
```

フィーチャー間の直接importは禁止（`architecture/no-cross-feature-import` で強制）。共有は `common/` 経由。`common` はどのフィーチャーにも依存しない。

技術スタック:

| 領域         | 採用                                            |
| ------------ | ----------------------------------------------- |
| 土台         | Vite + React 19 + TypeScript (SPA)              |
| ルーティング | React Router v7                                 |
| サーバー状態 | TanStack Query                                  |
| API 連携     | orval（service の OpenAPI から型 + hooks 生成） |
| UI           | Tailwind CSS v4 + shadcn/ui                     |
| フォーム     | react-hook-form + zod                           |
| テスト       | Vitest + React Testing Library + MSW            |

- `web` の `/api/*` は Vite proxy で service に転送される（`vite.config.ts`）。
- API クライアントは service の OpenAPI から生成する。契約変更時は `make gen-api` で再生成（→ 環境構築ドキュメント参照）。生成物はコミット済み。
- テストは `src/__test__/` に集約する（フィーチャーごとにサブディレクトリ、例 `src/__test__/greeting/`）。API は MSW でモックする。

## Gitフック (Lefthook)

`pnpm install` 時に自動でインストールされる（`prepare` スクリプト）。

| フック     | 内容                                                            |
| ---------- | --------------------------------------------------------------- |
| pre-commit | ステージ済みファイルに secretlint / prettier --check / ESLint   |
| commit-msg | commitlint（Conventional Commits: `feat:` `fix:` `docs:` など） |
| pre-push   | apps/web・apps/service の typecheck と apps/service のテスト    |
