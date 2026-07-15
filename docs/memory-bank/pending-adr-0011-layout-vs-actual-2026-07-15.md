# 草案（pending）: ADR-0011 の例示レイアウトと実 apps/service 構造の相違

> `/flywheel` 方式の書き戻し草案。**確定は人（PM／AIアーキ）が `docs/adr/` へ**。
> 自律エージェントは `docs/adr/` を直接書き換えない（protect-paths / settings deny）。
> 起票: 2026-07-15（ハーネス取り込み後の環境整備 #8）

## 背景（調査結果）

- **NestJS vs Express は既に解決済み。** `docs/adr/0002-nestjs-for-ts-backend.md` は
  frontmatter `status: superseded by ADR-0011`、`docs/adr/0011-express-with-enforced-layering.md`
  は `accepted`。実コード `apps/service` も **Express 5**（`express@^5.1.0`）。矛盾なし。
  → 当初「0002/0011 併存で要整理」と挙げたが、**ADR 自体の対応は不要**。

## 残る論点（人の判断が要る）

ADR-0011 が「強制する構造」として例示するファイル命名と、実際の `apps/service` の構造が異なる。

| ADR-0011 の例示 | 実 apps/service |
|---|---|
| `backend/src/<feature>/<feature>.router.ts` | `src/<feature>/interfaceAdapter/api/route/*.ts` |
| `<feature>.service.ts` | `src/<feature>/use-case/*.ts`（＋ `domain/`） |
| `<feature>.repository.ts` | `src/<feature>/infra/repository/*.ts` |
| `<feature>.schema.ts` | `interfaceAdapter/api/contract/*.ts` |

- 依存方向（一方向・逆流禁止・合成ルートは `app.ts`）という**ADR-0011 の要諦は実装と一致**。
- 相違は「フラットな `<feature>.*.ts`」対「クリーン/ヘキサゴナル風のディレクトリ分割」という**命名・配置の粒度のみ**。
- 放置リスク: 新機能実装時、エージェントが ADR-0011 の `<feature>.router.ts` 命名を正と誤解し、
  既存の `interfaceAdapter/api/route` 慣習とズレたコードを生む。

## 提案（どちらか／人が選ぶ）

1. **CLAUDE.md §5 に実レイアウトを1〜2行追記**（軽量・推奨）。ADR-0011 は歴史記録として据え置き、
   「実 apps/service の配置は `interfaceAdapter/api/route`・`use-case`・`domain`・`infra/repository`。
   ADR-0011 の `<feature>.*.ts` は当時の例示で、依存方向の原則のみ生きる」と明記。
2. **短い追補 ADR（例 0019）** を人が起票し、実レイアウトを正式化して ADR-0011 の例示を上書き。

## 併記メモ（同じ環境整備で対応済み・未対応）

- ✅ runner（`tools/teamdev-test-runner-mcp`）は `uv sync` 済み・22/23 test pass（1 失敗は Windows の
  socket bind 権限 `WinError 10013` でテスト環境依存。本体コード欠陥ではない）。
- ✅ statusline を slice-aggregator 非依存の自己完結版に置換。
- ✅ `.gitattributes` に `*.sh text eol=lf`。
- ⏸ `reference-mock/`・`acceptance/` は未整備（参照モック未用意のため上流フェーズ前提が未成立）。
