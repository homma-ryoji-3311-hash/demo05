# pending ハーネス不具合: 層依存 lint の許可パスが infra/ を認識しない（2026-07-15）

> `/flywheel` の隔離草案（ハーネス欠陥 → AIアーキ／Harness-Keeper・CLAUDE.md §10）。
> slice-01 の実装では**回避せず報告**する（§3。押し切らない）。修正は AIアーキが行う。

## 事象

`apps/service` の lint（`architecture/dependency-direction-restriction`）が、**変更していない既存ファイル**
`src/common/infra/prisma/prismaService.ts` を2件エラーにする：

```
ORM・DBクライアント（@prisma/adapter-pg）のimportは infrastructure/ 内でのみ許可されています。
ORM・DBクライアント（../../../generated/prisma/client.js）のimportは infrastructure/ 内でのみ許可されています。
```

## 切り分け（私由来でない証拠）

- `git diff HEAD` に `prismaService.ts` は無い（未変更）。
- 私の新規 `src/reports/**` を単独 lint → **エラー0**（clean）。
- `git stash -u` で私の変更を全て退避したベースラインで lint → **同じ dependency-direction エラーが2件**。

→ **ベースライン既存の不整合**。ルールの許可パスが `infrastructure/` を期待しているが、
scaffold のディレクトリ命名は `infra/`（`common/infra/prisma/`）。正当な infrastructure ファイルが誤検知される。

## 提案（AIアーキが判断）

- lint ルール（`eslint.config.mjs` 付近の architecture ルール）の許可パスを `infra/` にも合わせる、
  または scaffold の `infra/` を `infrastructure/` に統一する。
- どちらも**ハーネス（`.claude`/lint 設定・scaffold 規約）の修正**であり、slice-01 のフィーチャー範囲外。
  下流セッションでは触らず本草案として上げる。

## slice-01 への影響

- slice-01 の実装コード（`src/reports/**`・`app.ts`・`main.ts`・`error-handler.ts`・schema）は lint clean・typecheck 緑・テスト緑。
- lint ゲートの赤は**この既存不具合のみ**。統合前に AIアーキが解消する前提。
