# architecture/entity-naming-convention

domain/model/ 内のエンティティ命名規則を強制する。

## 重大度

`warn`

## 対象

`src/**/domain/model/**/*.ts`（`*.test.ts` は除外）

## なぜ必要か

エンティティは「IDで同一性が決まり、ビジネスルールを自身のメソッドとして持つ」ドメインの中心部品。命名が統一されていると、コード中で `XxxDomainEntity` を見た瞬間に「これはドメインの本体で、ルールはこの中にある」と判断できる。

## ルール

1. exportされたクラス名は `DomainEntity` サフィックス必須
2. ファイル名はクラス名から `DomainEntity` を省いた camelCase

| クラス名             | ファイル名  |
| -------------------- | ----------- |
| `ReportDomainEntity` | `report.ts` |
| `StaffDomainEntity`  | `staff.ts`  |

## エンティティの実装規約（ボイラープレート: `report.ts` 参照）

- `private constructor` + `private readonly _field`
- getterで公開（`Date` や配列は防御的コピーを返す）
- 更新系メソッドは**新しいインスタンスを返す**（イミュータブル）
- `static create(params)` — 新規作成。ビジネスルールを検証する
- `static reconstruct(params)` — 永続化層からの復元。検証しない
- `toJSON()` — レスポンス・永続化用のプレーンオブジェクト表現

## 検出例

```typescript
// ❌ サフィックスなし
// src/report/domain/model/report.ts
export class Report {}

// ❌ ファイル名がクラス名と不一致
// src/report/domain/model/reportEntity.ts
export class ReportDomainEntity {}
// → ファイル名は report.ts であるべき

// ✅
// src/report/domain/model/report.ts
export class ReportDomainEntity {
  private constructor(private readonly _id: string /* ... */) {}
  static create(params) {
    /* ルール検証して生成 */
  }
}
```

## エラーメッセージ

> domain/modelディレクトリ内のクラスには"DomainEntity"サフィックスが必要です。検出されたクラス名: "{{className}}"

> ファイル名が正しくありません。クラス名"{{className}}"に対して、ファイル名は"{{expectedFileName}}.ts"である必要があります。

## 関連

- `architecture/error-naming-convention` — エンティティのメソッドが投げるドメインエラーの定義規約
- `architecture/usecase-naming-convention` — エンティティを操作するユースケースの命名規約
