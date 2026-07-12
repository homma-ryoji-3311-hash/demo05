# architecture/no-raw-error-throw

`throw new Error()` / `throw Error()` を禁止し、カスタムエラークラスの使用を強制する。

## 重大度

`warn`

## 対象

`src/**/*.ts`（`*.test.ts` は除外）

## なぜ必要か

生の `Error` は「何が起きたか」を型で表現できないため、適切なHTTPステータスに対応づけられない（全部500になる）。業務固有のエラークラスを投げれば、共通の error-handler が種別に応じてHTTPレスポンスへ変換できる。

エラーハンドリングの全体像（フィーチャーごとの変換関数は作らず、大本の error-handler 1個に集約する）:

```
domain/error/ のカスタムエラーを throw
  （Error を直接 extends しつつ common/error の DomainError を実装し、kind を宣言）
  → common の error-handler ミドルウェアが kind → HTTPステータスに一元変換して送出
  → 未知のエラーは error-handler 内でログに残し、内部情報を漏らさず500
```

## 検出例

```typescript
// ❌ 生のError
throw new Error('確定済みの報告は変更できません');

// ❌ new なしも検出
throw Error('不正な入力');

// ✅ 業務固有のカスタムエラークラス
import { ReportAlreadyConfirmedError } from '../error/reportAlreadyConfirmedError.js';
throw new ReportAlreadyConfirmedError(report.id);

// ✅ 新しい種類が必要なら domain/error/ に1クラス1ファイルで追加する
// （定義規約は architecture/error-naming-convention が強制する）
```

## エラーメッセージ

> 生のErrorクラスのthrowは禁止です。業務的な意味を表現したカスタムエラークラスを各フィーチャーの domain/error/ に定義して使用してください。

## 限界

`throw new TypeError()` などErrorのサブクラスや、変数に入れてからのthrow（`const e = new Error(); throw e;`）は検出しない。

## 関連

- `architecture/error-naming-convention` — domain/error/ 内のエラークラスの定義規約
