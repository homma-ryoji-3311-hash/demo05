# Domain Docs

エンジニアリングスキル（`improve-codebase-architecture` / `diagnose` / `tdd` 等）がこのリポのドメイン文書を読む際のルール。

## レイアウト: single-context

```
/
├── CONTEXT.md        ← 用語の正本
├── docs/adr/         ← 決定の正本
└── apps/service/ apps/web/ acceptance/ reference-mock/
```

`CONTEXT-MAP.md` は無い。探索前に `CONTEXT.md` と、触る領域に関係する `docs/adr/` を読むこと。

## 用語は glossary に従う

出力（issue タイトル・リファクタ提案・仮説・テスト名）でドメイン概念に触れるときは `CONTEXT.md` の定義語を使う。同義語に流れない。glossary に無い概念が必要になったら、それはシグナル — 発明しているか、実際のギャップ。後者なら `/grill-with-docs` 向けにメモする。

## ADR 衝突は明示する — ただし書き換えない（staff-report 上書き）

出力が既存 ADR と矛盾するなら黙って上書きせず明示する:

> _Contradicts ADR-0011 (Express＋構造規約) — ただし再検討の価値があるのは…_

**重要**: 汎用スキル（`grill-with-docs` 等）は CONTEXT.md / ADR をインライン更新しようとするが、このリポでは `docs/adr/` への書込は hook でブロックされる。変更提案は `/flywheel` で `docs/memory-bank/pending-*.md` に草案として隔離し、PM 承認を待つ（CLAUDE.md §10）。
