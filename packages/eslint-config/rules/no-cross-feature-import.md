# architecture/no-cross-feature-import

フィーチャー間の直接importを禁止する。

## 重大度

`error`

## 対象

`src/**/*.ts`

## なぜ必要か

フィーチャーファースト構成の価値は「フィーチャー単位で独立して変更・削除できる」こと。フィーチャーが互いの内部に直接手を伸ばし始めると、変更の影響範囲が読めなくなり、レイヤーを分けた意味が薄れる。マイクロサービスならネットワーク境界が強制する分離を、モノリスではこのルールが肩代わりする。

## ルール

`src/` 直下の第1セグメントをフィーチャー名とみなして判定する。

| import元 → 先                       | 判定                           |
| ----------------------------------- | ------------------------------ |
| フィーチャー → 同一フィーチャー内部 | ✅                             |
| フィーチャー → `common`             | ✅                             |
| フィーチャー → 別フィーチャー       | ❌                             |
| `common` → フィーチャー             | ❌（commonは何にも依存しない） |

- 相対importのみ検査。`path.resolve` で実パスに解決してから比較する
- `src/` 直下のファイル（`app.ts` など）と `__tests__/` は対象外（フィーチャーではないため）

## 共有したいときの正しい方法

1. 汎用部品（エラー型、ユーティリティ）→ `common/` に移す
2. 別フィーチャーの機能が必要 → 欲しい形のインターフェースを**自分の** `domain/` に定義し、実装アダプタを `app.ts`（コンポジションルート）で注入する

## 検出例

```typescript
// ❌ report が skillSheet の内部に直接依存
// src/report/usecases/submit.ts
import { generate } from '../../skillSheet/usecases/generate.js';

// ❌ common がフィーチャーに依存
// src/common/config/env.ts
import { Report } from '../../report/domain/model/report.js';

// ✅ common への依存
// src/report/domain/model/report.ts
import { HttpException } from '../../../common/interfaceAdapter/api/httpException.js';
```

## エラーメッセージ

> フィーチャー "{{sourceFeature}}" から "{{targetFeature}}" への直接importは禁止されています。共有コードは common/ に置くか、インターフェースを定義して app.ts で注入してください。

> common からフィーチャー "{{targetFeature}}" へのimportは禁止されています。common はどのフィーチャーにも依存できません。
