# `.claude/` — staff-report のハーネス（箱）

M-team（`M-team：AI駆動開発` リポジトリ）で確立した型の移植版。
構築・所有は **AIアーキテクト**。ただし「文言」の正本は分担される（M-team 計画書 §2 ファイル所有マップ）。
`.claude/` 全体を git 管理し、変更は **PR レビュー対象**にする。箱の変更もチームの目を通す。

| 対象 | 構築（箱） | 中身（文言） |
|---|---|---|
| `agents/*.md` | AIアーキ | AIアーキ |
| `skills/*/SKILL.md` | AIアーキ | 骨組み＝AIアーキ／枠・禁止事項＝**リーダー** |
| `settings.json`・`hooks/` | AIアーキ | AIアーキ |
| `../CLAUDE.md`（repoルート） | AIアーキ（体裁） | **PM**（上流全体で合意） |
| `../.mcp.json`（repoルート） | AIアーキ | AIアーキ |

> `CLAUDE.md` と `.mcp.json` は `.claude/` の**中ではなく repo ルート**にある。

## M-team からの翻訳表（このリポジトリでの対応物）

| M-team | staff-report（このリポジトリ） |
|---|---|
| `backend/`（Express 3層） | `apps/service/`（Express 5・クリーンアーキテクチャ） |
| `frontend/`（Next.js） | `apps/web/`（React SPA・Vite） |
| `acceptance/*.api.spec.ts` | `apps/service/src/__tests__/integration/**/*.integration.test.ts`（supertest + InMemory） |
| `acceptance/*.ui.spec.ts` | `apps/web/src/__test__/**/*.acceptance.test.tsx`（RTL + MSW）／将来 `e2e/`（Playwright） |
| `reference-mock/`（answer key） | `docs/画面仕様/`・`docs/必要画面・機能一覧.md`（実行不可の answer key） |
| golden スクリーンショット | 当面 DOM アサーション代替。Playwright 導入後に復活 |
| バリデーション失敗 422 | **400**（ZodError → error-handler の規約） |
| カスタム lint（層規約） | `packages/eslint-config` の `architecture/*` ルール（CI で fail） |

## 中身

```
.claude/
├── agents/
│   ├── explore.md              Haiku・read-only。地図を返す
│   └── audit.md                Opus・read-only（Bashなし）・memory: project。推奨判定を返す
├── skills/                     叩くのはスラッシュだけ（全て disable-model-invocation）
│   ├── spec/                   上流。Phase A=grill で仕様表／Phase B=テスト翻訳。**PM／AIアーキが叩く**
│   ├── slice/                  ★下流の幸福経路。下の5本を直列実行する
│   ├── pickup/ explore/ implement/ verify/ submit/   復旧経路（途中から叩き直せる）
│   ├── flywheel/               上流（Harness-Keeper）用。書き戻し草案
│   └── express-review-rules/    user-invocable: false。Audit が読む監査型ルール集
├── hooks/                      決定論的ゲート（exit 2 でブロック）
│   ├── lib.sh                  共通・JSONログ（logs/hooks/*.jsonl ＝ Harness-Keeper の監査証跡）
│   ├── pre-tool-use-bash.sh    危険コマンド deny-list（git/main・prisma migrate・rm -rf 等）
│   ├── protect-paths.sh        ブランチ層で書込権を判定（spec/*・feature/*・main）＋承認ゲート
│   ├── post-tool-use-check.sh  prettier + typecheck + eslint の非ブロッキング feedback（パッケージ単位）
│   ├── stop-gate.sh            受け入れテスト未通過なら完了扱いにしない（test-results/*.json を見る）
│   └── post-compact-reinject.sh compaction 後に禁止事項を再注入
└── settings.json               hooks 配線・permissions deny・env
```

## 設計原則

1. **三層モデル**: 宣言（CLAUDE.md/skills）→ 実行時強制（hooks/permissions/tools）→ 事後検証（CI/ブランチ保護）。
   宣言単体の遵守率は低い。**同じルールを宣言と機械的強制のペアで張る。**
2. **ブロックは不可逆・高コスト操作に集中投下**する。過剰ブロックは人間をクリック係にする（アンチパターン）。
   それ以外は `PostToolUse` の非ブロッキング feedback で返す。
3. **exit code**: `exit 2` = ブロック（stderr がモデルに返る）／`exit 1` は**非ブロッキング**。
   ポリシー強制のつもりで exit 1 を使うのは典型的バグ。
4. **ブロック時の stderr には修正指示を書く**（良性のプロンプトインジェクション）。
5. **繰り返し破られるルールは hook 昇格の合図。** エージェントの struggle はハーネスの欠陥シグナル。
6. **SKILL.md は禁止事項を冒頭に置く**（compaction 時は先頭 ~5,000 トークンだけが再添付される）。
7. **モデル配分は frontmatter で固定**し、人の判断に委ねない（Explore=Haiku / Implementer=Sonnet / Audit=Opus）。

## 前提となる外部 skills（vendor 済み）

- mattpocock/skills 由来: `tdd`・`diagnose`（下流）、`grill-with-docs`・`to-issues`・`to-prd`（上流）、
  `git-guardrails-claude-code`・`setup-pre-commit`（安全レール）、`handoff`。出典 SHA は各 PROVENANCE.md。
  - この repo は lefthook 運用のため `setup-pre-commit`（Husky）は原則使わない。参考として置く。

## 未実装（TODO）

- `e2e/`（Playwright）＋ golden スクリーンショット基盤 → 導入後、/verify 判定2 と stop-gate を pixel 差分に戻す
- `Summarizer` 抽象化層（AI整形・スキルシート生成の導入時。C-8 の対象）
- GitHub ブランチ保護（main の PR 必須・force-push 禁止・マージは統合役のみ）＝**main 防御の正本**
- `docs/design/overview.md`（基本設計の正本）と `docs/slices/README.md` の初回採番（工程1〜2）
