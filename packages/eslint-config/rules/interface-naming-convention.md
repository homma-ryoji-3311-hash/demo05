# interface-naming-convention

`domain/interface/` に置くインターフェース（リポジトリ等の抽象）の命名規則を強制する。

## ルール

- `domain/interface/` 内のエクスポートされたインターフェース名は **"Interface" サフィックス必須**
  - 実装クラスと同名で衝突させず、抽象と実装を名前で区別するため
  - 例: 抽象 `GreetingRepositoryInterface`（`domain/interface/`）↔ 実装 `GreetingRepository`（`infra/repository/`）
- ファイル名はインターフェース名から `Interface` を省いた camelCase
  - 例: `GreetingRepositoryInterface` → `greetingRepository.ts`

## 対象

`src/**/domain/interface/**/*.ts`（`*.test.ts` は除外）

## なぜ必要か

リポジトリなどの依存を「domain がインターフェースを定義し、infra が実装、コンポジションルートで注入」する構成では、
抽象と実装が別レイヤーに同種の名前で存在する。両者を `XxxInterface` / `Xxx` で機械的に区別できると、
import 時にどちらを触っているか（差し替え可能な抽象か、具体実装か）が一目で分かる。

## 検出例

```ts
// ❌ サフィックスなし
export interface GreetingRepository { ... }

// ❌ ファイル名不一致（greetingRepositoryInterface.ts など）

// ✅
// src/template/domain/interface/greetingRepository.ts
export interface GreetingRepositoryInterface {
  save(greeting: GreetingDomainEntity): Promise<void>;
  findLatest(): Promise<GreetingDomainEntity | null>;
}
```

## 関連

- `architecture/layer-dependency-restriction` — infra が domain のインターフェースを実装する依存方向を担保する
