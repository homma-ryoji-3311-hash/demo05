# architecture/dependency-direction-restriction

技術的関心事のnpmパッケージのimportを `infrastructure/` に制限する。

## 重大度

`error`

## 対象

`src/**/*.ts`

## なぜ必要か

ORM・AI SDK・通知SDKなどの「外部サービスの都合」が usecases や domain に漏れると、プロバイダの乗り換え・テスト・モック差し替えができなくなる。仕様の「AI処理は提供元非依存の抽象化層の背後で実行する」をルールとして強制する。

使いたい機能は `domain/` にインターフェースを定義し、SDKを使う実装を `infrastructure/` に置いて、`app.ts` で注入する。

## ルール

| 分類                      | パッケージ                                                                     | 許可場所                                 |
| ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| ORM・DBクライアント       | `@prisma/client`, `prisma`, `drizzle-orm`, `kysely`, `typeorm`, `pg`, `mysql2` | `infrastructure/` + コンポジションルート |
| AI SDK                    | `@anthropic-ai/sdk`, `openai`, `@google/genai`, Bedrock                        | `infrastructure/` のみ                   |
| 通知SDK                   | `@slack/web-api`, `@slack/bolt`, `nodemailer`                                  | `infrastructure/` のみ                   |
| Excel・ファイル生成       | `exceljs`, `xlsx`                                                              | `infrastructure/` のみ                   |
| オブジェクトストレージSDK | `@aws-sdk/client-s3`, `@google-cloud/storage`                                  | `infrastructure/` のみ                   |

- コンポジションルート = `src/app.ts`, `src/main.ts`（DBクライアントの生成・共有のために許可）
- サブパスimport（`@prisma/client/runtime` など）も検出する
- **Prisma 7の生成クライアント**（`src/generated/prisma/` への相対import）もORM・DBクライアントとして検出する（`pathIncludes`）

## 検出例

```typescript
// ❌ usecases で Prisma を直接使用
// src/report/usecases/submit.ts
import { PrismaClient } from '@prisma/client';

// ❌ usecases で AI SDK を直接使用
// src/report/usecases/summarize.ts
import Anthropic from '@anthropic-ai/sdk';

// ✅ infrastructure 内での使用
// src/report/infrastructure/ai/anthropic-summarizer.ts
import Anthropic from '@anthropic-ai/sdk';
```

## エラーメッセージ

> {{label}}（{{package}}）のimportは infrastructure/ 内でのみ許可されています。抽象化インターフェースを domain/ に定義し、実装を infrastructure/ に置いてください。

## パッケージを追加するには

`rules/dependency-direction-restriction.mjs` の `RESTRICTION_RULES` 配列にエントリを1つ追加する。STTプロバイダ等を導入する際は忘れずに登録すること。
