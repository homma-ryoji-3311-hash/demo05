# architecture/no-vitest-mock-in-integration

Integration Test での `vi.mock` / `vi.doMock` / `vi.fn` / `vi.spyOn` の使用を禁止する。

## 重大度

`error`

## 対象

- `src/**/__tests__/integration/**/*.test.ts`
- `src/**/*.integration.test.ts`

この2パターンが「Integration Testの命名規約」を兼ねる。どちらかに該当するファイルだけがこのルールの対象になる。

テストファイルの配置規約:

- 単体テスト: テスト対象の近くの `__tests__/` 内（例: `src/report/domain/model/__tests__/report.test.ts`）
- Integration Test: `__tests__/integration/` 内

## なぜ必要か

Integration Test の目的は「部品を組み合わせたときに本当に動くか」の確認。依存をモックで差し替えると、テストが通っても実際の組み合わせが壊れている可能性が残り、テストの信頼性がなくなる。

依存を差し替えたい場合はモックではなく **InMemory実装**（例: `InMemoryReportRepository`）を使う。InMemory実装は本物と同じインターフェースを満たすので、組み合わせの検証として機能する。

- 単体テスト（`*.test.ts`）ではモック使用は自由
- DBやAIをスタブにしたいだけなら、それは単体テストとして書くべきサイン

## 検出例

```typescript
// ❌ Integration Test でモック
// src/report/submit.integration.test.ts
import { vi } from 'vitest';
vi.mock('../infrastructure/repository/prismaReportRepository.js');
const fake = vi.fn();

// ✅ InMemory 実装を注入
// src/report/submit.integration.test.ts
const app = createApp({ reportRepository: new InMemoryReportRepository() });
```

## エラーメッセージ

> Integration Test でのモック（vi.{{method}}）は禁止です。実物または InMemory 実装を使用してください。
