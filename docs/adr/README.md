# ADR — M-team から継承した決定record

この `docs/adr/` は **M-team（`M-team：AI駆動開発` リポジトリ）で確立した方法論の決定record を継承**したもの。
staff-report はその型の適用先であり、ADR 本文中の M-team 固有の用語は次の翻訳表で読む
（詳細は `.claude/README.md`）。

| ADR 本文の用語 | このリポジトリでの対応物 |
|---|---|
| `backend/`（Express 3層・ADR-0011） | `apps/service/`（Express 5・クリーンアーキテクチャ。層強制は `packages/eslint-config` の `architecture/*`） |
| `frontend/`（Next.js） | `apps/web/`（React SPA・Vite） |
| `acceptance/*.api.spec.ts` | `apps/service/src/__tests__/integration/**/*.integration.test.ts` |
| `acceptance/*.ui.spec.ts` | `apps/web/src/__test__/**/*.acceptance.test.tsx`／将来 `e2e/` |
| `reference-mock/`（実行可能な answer key・ADR-0005） | `docs/画面仕様/`＋`docs/必要画面・機能一覧.md`（**実行不可**の answer key。よって「モックで緑」の実行時証明は静的検知＋実装不在の赤確認で代替） |
| golden スクリーンショット（ADR-0008） | 当面 DOM アサーション代替。Playwright（`e2e/`）導入後に復活 |
| バリデーション失敗 422 | **400**（ZodError → 共通 error-handler） |
| NestJS 不採用（ADR-0002） | 本 repo は Express 5 採用で同趣旨（フレームワーク規約より自前規約＋lint 強制） |

新しい決定はこのディレクトリに `NNNN-<slug>.md` で追加する（0019〜）。
書き戻しは `/flywheel` の草案 → 人が確定。**エージェントによる直接編集は hook でブロックされる。**
