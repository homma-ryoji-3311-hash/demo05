# architecture/error-naming-convention

domain/error/ 内のドメインエラー定義規約を強制する。

## 重大度

`warn`

## 対象

`src/**/domain/error/**/*.ts`

## なぜ必要か

エラーハンドリングの方針は「業務固有のエラークラスを1クラス1ファイルで定義し、HTTPへの変換はフィーチャー専用の変換関数に集約する」。この方針が機能するには、エラークラス側の形が揃っている必要がある:

- **業務固有名**（`ReportAlreadyConfirmedError`）だから変換関数のinstanceof分岐が読める
- **`this.name` の設定**がないと、ログやスタックトレースで全部 `Error` としか表示されず調査できない
- **基底クラスを挟まない**ことで「とりあえず基底でcatch」という雑な分岐を防ぎ、エラーごとに変換先を明示させる

## ルール

1. exportされたクラスは `Error` を直接 `extends` する
2. クラス名は `Error` サフィックス必須
3. ファイル名はクラス名の先頭を小文字にしたもの（1クラス1ファイル）
4. コンストラクタで `this.name = 'クラス名'` を設定する

| クラス名                      | ファイル名                       |
| ----------------------------- | -------------------------------- |
| `EmptyReportBodyError`        | `emptyReportBodyError.ts`        |
| `ReportAlreadyConfirmedError` | `reportAlreadyConfirmedError.ts` |

## 検出例

```typescript
// ✅ 規約に沿ったドメインエラー
// src/report/domain/error/reportAlreadyConfirmedError.ts
export class ReportAlreadyConfirmedError extends Error {
  constructor(reportId: string) {
    super(`確定済みの報告は変更できません: ${reportId}`);
    this.name = 'ReportAlreadyConfirmedError';
  }
}

// ❌ 基底クラスを挟んでいる
export class ReportNotFoundError extends DomainError {}

// ❌ サフィックスなし
export class ReportAlreadyConfirmed extends Error {}

// ❌ this.name 未設定（ログで 'Error' としか出ない）
export class ReportNotFoundError extends Error {
  constructor() {
    super('報告が見つかりません');
  }
}
```

## エラーメッセージ

> ドメインエラーは Error を直接 extends してください。基底クラスを挟まず、クラス名で業務的な意味を表現します。

> domain/error/ 内のクラスには"Error"サフィックスが必要です。

> ファイル名が正しくありません。クラス名"{{className}}"に対して、ファイル名は"{{expectedFileName}}.ts"である必要があります。

> コンストラクタで this.name = '{{className}}' を設定してください。設定しないとログやスタックトレースで 'Error' としか表示されません。

## 関連

- `architecture/no-raw-error-throw` — 生の `throw new Error()` を禁止し、ここで定義したエラーの使用を強制する
- ドメインエラーは `Error` を直接 extends しつつ `common/error` の `DomainError` を実装し、`kind`（validation / not_found / conflict など）を宣言する。HTTP ステータスへの変換は共通の error-handler が `kind` を見て一元的に行う（フィーチャーごとの変換関数は作らない）
