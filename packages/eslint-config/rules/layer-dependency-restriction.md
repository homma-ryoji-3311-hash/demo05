# architecture/layer-dependency-restriction

レイヤー間の依存方向を制限する（クリーンアーキテクチャ準拠）。

## 重大度

`error`

## 対象

`src/**/*.ts`

## なぜ必要か

ビジネスルール（domain）がHTTPやDBなどの技術詳細に依存すると、フレームワークの変更・テスト・再利用がすべて難しくなる。依存を常に「外側 → 内側」の一方向に保つことで、内側のコードは何にも引きずられず変更・テストできる。

## ルール

許可される依存方向:

```
interfaceAdapter → usecases → domain ← infrastructure
```

| import元 ＼ 先   | domain | usecases | infrastructure | interfaceAdapter |
| ---------------- | ------ | -------- | -------------- | ---------------- |
| domain           | -      | ❌       | ❌             | ❌               |
| usecases         | ✅     | -        | ❌             | ❌               |
| infrastructure   | ✅     | ❌       | -              | ❌               |
| interfaceAdapter | ✅     | ✅       | ❌             | -                |

- 相対import（`./` `../` 始まり）のみ検査する
- どのレイヤーにも属さないファイル（`src/app.ts`, `src/main.ts` などのコンポジションルート）は対象外。依存の組み立て場所なので全レイヤーをimportしてよい

## 検出例

```typescript
// ❌ usecases から infrastructure の実装を直接使用
// src/report/usecases/createReport.ts
import { PrismaReportRepository } from '../infrastructure/repository/prismaReportRepository.js';

// ✅ usecases は domain のインターフェースに依存する
// src/report/usecases/createReport.ts
import type { ReportRepository } from '../domain/repository/reportRepository.js';

// ✅ 実装の注入はコンポジションルートで行う
// src/app.ts
import { PrismaReportRepository } from './report/infrastructure/repository/prismaReportRepository.js';
```

## エラーメッセージ

> {{sourceLayer}}層から{{targetLayer}}層へのimportは禁止されています。依存方向: interfaceAdapter → usecases → domain ← infrastructure

## 限界

レイヤー判定はパスの文字列マッチ（`/domain/` 等）なので、レイヤーディレクトリ名を変更した場合はルール内の定数も更新すること。
