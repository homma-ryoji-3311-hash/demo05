# 草案（pending）: 指示書 §3 が合成ルートを列挙し漏らす（2ストライク成立）

> `/flywheel` 方式の書き戻し草案。**確定は人（PM＝指示書テンプレの正本所有者）が
> `docs/slices/_template.md` へ**。起票: 2026-07-16（slice-02 / issue #4 の下流セッション中）

## 観察

スライス指示書 §3「触ってよいファイル範囲」が、**合成ルート（コンポジションルート）と
ルート登録を列挙していない**。しかし受け入れテストは、それらを変更しないと緑にならない。
下流は毎回「範囲外だが必須」の判断を強いられ、逸脱を PR で自己申告している。

| スライス | §3 に無いが変更が必須だったファイル | 無いとどうなるか |
|---|---|---|
| slice-01 | `apps/service/src/app.ts`（`/reports` を root にマウント・repository 注入）<br>`apps/web/src/router.tsx`（`/reports/new`）<br>`apps/web/src/common/api/client.ts`（認証 seam）<br>`apps/web/vite.config.ts`（`/reports` proxy） | エンドポイントが存在せず全 AC が赤 |
| slice-02 | `apps/service/src/app.ts`（`FakeSummarizer` 注入）<br>`apps/web/src/router.tsx`（`/reports/new/review`） | ルート未登録で `page.goto` が届かず UI が赤 |

**2回連続で同じ逸脱**。slice-03〜07 も同じ構造（新エンドポイント＋新画面）なので、全スライスで再発する。

## 発生源はテンプレ

`docs/slices/_template.md` の §3:

```
- `apps/service/src/<feature>/` （`*.router.ts` / `*.service.ts` / `*.repository.ts` / `*.schema.ts`）
- `apps/web/app/<path>/**`
- 上記範囲の unit テスト
```

フィーチャー配下しか挙げていない。各スライスの指示書はこれを写しているので、**欠落が全スライスに継承される**。

> なお、この §3 例示の `*.router.ts` 命名が実 `apps/service`（`interfaceAdapter/api/route/*.ts`）と
> 食い違う件は既出（`pending-adr-0011-layout-vs-actual-2026-07-15.md`）。本件は**別の欠落**で、
> 「命名が違う」ではなく「合成ルートというカテゴリごと無い」。

## なぜ放置できないか

ADR-0018 は §3 を「許可であると同時に予告」と定め、**挙げたディレクトリに diff が無いまま
完了報告することを禁じ**、触らずに緑なら「実装ではなくテストか指示書が間違っている」として
上流へ返させる。この判定は §3 の記載を正としている。

つまり **§3 が不完全だと、ADR-0018 の判定3 そのものが機能しない。** 現状は下流が
「§3 に無いが必須」と毎回自己申告してすり抜けており、判定が人間の善意に依存している。
悪意なき下流が黙って書けば誰も気づかない。

## 分類と強制力の階段

- **分類: スライス設計の欠陥**（指示書の書式）→ PM へ
- **現在: なし**（テンプレに記載が無い）
- **提案: 宣言へ1段**（テンプレ §3 に1行足す）。hook / CI への飛び級はしない。
- 発生回数: **2回目**（slice-01・slice-02）→ 2ストライクルール成立

## 提案する差分（`docs/slices/_template.md` §3）

```diff
 - `apps/service/src/<feature>/` （`*.router.ts` / `*.service.ts` / `*.repository.ts` / `*.schema.ts`）
 - `apps/web/app/<path>/**`
+- **合成ルートと配線**（新しいエンドポイント／画面を足すスライスでは必須）:
+  `apps/service/src/app.ts`（依存の注入・ルーターのマウント）／`apps/web/src/router.tsx`（ルート登録）
+  ／必要なら `apps/web/vite.config.ts`（proxy）・`apps/web/src/common/api/client.ts`
 - 上記範囲の unit テスト
```

**各スライスの指示書 §3 にも同じ1行を反映する必要がある**（テンプレを直しても既存7本は直らない）。

## 剪定提案

`CLAUDE.md` への追加は**不要**。§5「アーキテクチャの骨格」に既に
「`app.ts` が唯一の合成ルート」とある。**問題は憲法の欠落ではなく指示書テンプレの欠落**なので、
書き足す場所はテンプレ。「この行を消したら Claude はミスをするか？」の基準でも、
憲法側に足す1行は下流のミスを防がない（下流が読むのは指示書 §3）。憲法は1行も足さない。

## 併記: 本件と対になる観察（判断を仰ぐ）

slice-02 の Audit が指摘した「§3 の 範囲外 に『一覧（slice-04）』とあるが、
`GET /reports/:id`（詳細取得）は明示されていない」件も同種。slice-02 の AC-4 が
`request.get('/reports/:id')` を叩くため実装が必須になったが、同じエンドポイントの仕様は
slice-04 の `list.api.spec.ts:22` にもある。**スライス間で共有されるエンドポイントの帰属**を
§3 が表現できていない。テンプレに「他スライスと共有する部分の帰属」を書く欄が要るかもしれない。
