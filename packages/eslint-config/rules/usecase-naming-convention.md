# architecture/usecase-naming-convention

usecases/ 内のクラス命名とファイル名の対応を強制する。

## 重大度

`warn`

## 対象

`src/**/usecases/**/*.ts`（`*.test.ts` は除外）

## なぜ必要か

usecaseは「アプリができること」の一覧になる場所。命名が統一されていると、ファイル一覧を見るだけで機能の全体像が把握でき、クラス名からファイルを迷わず特定できる。

## ルール

1. exportされたクラス名は `UseCase` サフィックス必須
2. ファイル名はクラス名から `UseCase` を省いた camelCase

| クラス名              | ファイル名        |
| --------------------- | ----------------- |
| `SubmitUseCase`       | `submit.ts`       |
| `CreateReportUseCase` | `createReport.ts` |
| `ListReportsUseCase`  | `listReports.ts`  |

- export されていないクラスは対象外
- クラスを使わない（関数ベースの）usecaseは対象外

## 検出例

```typescript
// ❌ サフィックスなし
// src/report/usecases/submit.ts
export class Submit {}

// ❌ ファイル名がクラス名と不一致
// src/report/usecases/create-report.ts
export class CreateReportUseCase {}
// → ファイル名は createReport.ts であるべき

// ✅
// src/report/usecases/createReport.ts
export class CreateReportUseCase {}
```

## エラーメッセージ

> usecasesディレクトリ内のクラスには"UseCase"サフィックスが必要です。検出されたクラス名: "{{className}}"

> ファイル名が正しくありません。クラス名"{{className}}"に対して、ファイル名は"{{expectedFileName}}.ts"である必要があります。現在のファイル名: "{{currentFileName}}.ts"
