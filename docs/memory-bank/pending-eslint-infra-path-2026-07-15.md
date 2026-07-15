# pending ハーネス不具合: 層依存 lint が Windows のパス区切りで誤動作（2026-07-15 / 解決 2026-07-16）

> `/flywheel` の隔離草案（ハーネス欠陥 → AIアーキ／Harness-Keeper・CLAUDE.md §10）。

## 【解決 2026-07-16・AIアーキ】真因と修正

**当初の診断（下記「事象」）は誤り。** ルールは既に `infra/`／`infrastructure/` の両方を許可していた
（`isInfrastructureLayer` が両名を判定）。真因は **Windows のパス区切り**：
- ESLint の `context.filename` は Windows で `\`（例 `src\common\infra\prisma\...`）。
- ルールの判定は `filename.includes('/infra/')` 等の**フォワードスラッシュ前提**で、`\infra\` に一致せず空振り。
- 結果、`dependency-direction-restriction` は正当な infra ファイルを**誤検知（false positive）**、
  `layer-dependency-restriction` は `detectLayer` が空振りして**依存方向を全く検査しない（false negative・より危険）**。

**修正**: 両ルールの `create()` 冒頭で `context.filename.replace(/\\/g, '/')` に正規化。
`packages/eslint-config/rules/{dependency-direction,layer-dependency}-restriction.mjs`。
→ `apps/service` の lint が clean。ADR-0011 の依存方向強制も Windows で復活。

## 残る別件（要フォロー・未修正）

- `layer-dependency-restriction` は use-case 層を `/usecases/` で判定するが、scaffold の実ディレクトリは
  **`use-case/`**（ハイフン）。`usecase-naming-convention` も `src/**/usecases/**` を対象にしており、
  どちらも**現 scaffold では発火しない**。use-case 層の依存方向・命名が未強制。命名を `use-case` に合わせるか
  scaffold を `usecases` に統一するかは AIアーキ判断（変更で既存違反が表面化しうるため検証必須）。

---

<details><summary>当初の（誤った）診断メモ 2026-07-15</summary>

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

</details>
