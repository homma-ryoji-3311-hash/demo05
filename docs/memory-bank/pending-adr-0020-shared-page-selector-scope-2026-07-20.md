# 草案: ADR-0020 — 共有ページを叩く受け入れセレクタは親スコープで限定する

> **これは ADR 草案の隔離置き場。** `docs/adr/` はこのブランチから書き込み拒否（protect-paths）のため、
> Harness-Keeper（AIアーキ）が確定時に `docs/adr/0020-acceptance-selectors-on-shared-pages-must-be-scoped.md` へ移す。
> ADR は Harness-Keeper 単独で確定してよい（PM 承認は不要）。ただし直書き禁止ガードのため一旦ここに隔離する。
> 由来: `/flywheel` 2026-07-20（工程10・slice-15〜23 下流バッチの締め）。

---

## 共通ページを叩く受け入れセレクタは親スコープで限定する（strict-mode 二重マッチ回帰の予防）

下流フェーズの統合で、**同一の失敗モードが2回**起きた。どちらも個別スライスのスイートは緑で、
**工程9b（総合 E2E）でのみ赤**になり、回帰スライス（slice-27・slice-28）で fix-forward した。

- **1回目（incidents.md #1・slice-10→27）**: `TemplateManagePage` が `<ul aria-label="テンプレート版一覧">` を足したところ、
  slice-10 自身の `manage.ui` の `getByLabel(/テンプレート|アップロード|ファイル/)` がファイル入力とこの `<ul>` に二重マッチし、strict mode 違反で赤。
- **2回目（incidents.md #2・slice-15→28）**: slice-15 が `/reports` に履行状況の `<ul role=list>` を足したところ、
  **先行スライス slice-04** の `reports/list.ui` の `getByRole('list')`（単一前提）が2つの list に二重マッチし、strict mode 違反で赤。

### 何が共通しているか

**下流スライスが既存の共有ページ（`/reports`・テンプレート管理画面など）に list / labeled 要素を1つ足すと、
そのページを `getByRole` / `getByLabel` で「ページに1個しかない」前提で叩いている受け入れテスト
（自分自身または先行スライスのもの）が strict-mode 二重マッチで赤くなる。**
これは実装の欠陥ではない——追加要素は仕様どおりで、セレクタの単一前提が壊れただけ。
per-slice スイートは当該ページに1要素しか無い世界を見ているので**絶対に検出できない**。結合して初めて2要素になる。
工程9b でしか出ないのは ADR-0010 の狙いどおりだが、**毎回 fix-forward の回帰スライスを1本消費する**のは高い。

帰責は個別スライスではなく**工程4（受け入れテスト翻訳）**にある。翻訳時に「このページは将来ほかのスライスが
要素を足す共有ページか」を意識せず、ページ全体スコープの `getByRole('list')` を書いた。2回起きた＝**2ストライク成立**。

### 決めたこと（草案）

1. **共有ページ（複数スライスが要素を追加しうるページ）を叩く受け入れセレクタは、ページ全体スコープの
   `getByRole('list')` / `getByLabel(...)` 単発ではなく、親リージョンでスコープを限定する。**
   `within(getByTestId('report-list'))` / `getByRole('region', { name: ... })` などで、
   そのスライスが検証したい1要素に必ず1個で当たるよう絞る。role/label の単一前提をページ全体に置かない。
2. **判定の場は工程4（`/spec` Phase B・翻訳）。** 翻訳者は「このページに後続スライスが list / heading / labeled 要素を
   足したら、この `getByRole`/`getByLabel` は二重マッチするか？」を撮影可否と同じ強さで問う。Yes なら親スコープで限定してから緑にする。
3. **これは 2ストライク → 宣言の1段のみ**（強制力の階段・CLAUDE.md §10）。飛び級して lint/CI ガードは今は作らない。
   宣言後に**3回目**が出たら、`acceptance/**` に対する「ページ全体スコープの `getByRole('list'|'listitem')` を
   親スコープなしで使わない」lint（事後検証）へ昇格する。
4. **回帰が出た場合の直し方は不変**（ADR-0014 fix-forward）。追加要素を消すのではなく、**セレクタを親スコープで限定する**か、
   **追加要素の role を外す**（slice-28 は履行状況を非 list 要素にした）。仕様表の UI-AC を壊さない側を選ぶ。

### 波及

- 工程4 の翻訳ガイド（`/spec` skill 本文・`acceptance/_template`）に「共有ページのセレクタは親スコープで限定する」を
  1行加える提案（宣言の実装先）。PR #43 が `_template` を触っているため、統合時に重複しないよう調整する。
- CLAUDE.md §6「非自明な落とし穴」への1行昇格候補 → `pending-shared-page-selector-clause-2026-07-20.md`（PM 承認待ち）。
- ADR-0010（工程9b が cross-slice 回帰を捕らえる）・ADR-0018（UI 二層）と整合。本 ADR はそれらの
  「捕らえた後、翻訳時に減らす」側の決定。
