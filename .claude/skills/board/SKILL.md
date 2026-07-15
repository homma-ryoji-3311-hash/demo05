---
name: board
description: スライスレジストリ（docs/slices/README.md）の採番・一覧・現在地表示。工程2 で依存順に一括採番し、分割・回帰の新スライスは末尾に append する。番号は不変・振り直し禁止（ADR-0013）。状態は書き込まず git/ファイル/gh から推論して表示する。各工程の入口で現在地確認に使う。Use when the user runs /board to number slices, append a slice, or check where each slice currently is.
disable-model-invocation: true
---

# /board

スライスレジストリ（`docs/slices/README.md`）を**単独で所有する**唯一のスキル（ADR-0013）。
他スキルはこの表を読むだけ。採番・表の更新はここでしか行わない。

## 禁止事項（最初に読む）

- **既存の番号を振り直さない（never renumber）。** `NN` はブランチ名・受け入れテストのパス・仕様表・issue に焼き込まれている。振り直しは全参照を孤児にする。
- **レジストリに状態列を書き込まない。** 「今どの工程か」は毎回実態から推論して**表示するだけ**。
- **行を削除しない。** append-only。不要になったスライスも行は残す（概要に注記してよい）。
- commit / push / main を進める操作はしない（表の編集はするが、コミットは人が行う）。

## モード判定

| 状況 | モード |
|---|---|
| レジストリが空（プレースホルダ行のみ） | **初回採番** |
| 引数に新スライスの由来がある（例: `/board append regression-of-slice-03`） | **append 採番** |
| それ以外（引数なし） | **現在地表示**（read-only） |

## 初回採番（工程2）

1. `docs/必要画面・機能一覧.md`・`docs/design/overview.md`（あれば）と `to-issues` の縦切り分解（番号を持たない生の一覧）を読む。
2. **依存順**に `slice-01..NN` を一括採番し、表に書き出す。仮番号は無い——この番号がそのまま確定。
3. 由来はすべて `overview`。粒度の目安：受入基準 ≤3〜5 / 1 issue = 1 スライス = 1 セッション。
4. この時点で issue は起票しない（起票は工程5 `/brief`）。

## append 採番（分割・回帰）

1. 既存の最大 `NN` の**次の番号**を新スライスに与え、表の**末尾**に追加する。
2. 由来を必ず書く：`split-of-slice-NN`（工程3 で受入基準が多すぎた分割）／`regression-of-slice-NN`（工程9b の総合テスト赤・ADR-0014）。
3. 依存列に元スライスを書く。

## 現在地表示（各工程の入口・read-only）

レジストリの各行について、**実態**から工程を推論して表示する。自己申告・記憶に頼らない。

| 見るもの | 判定 |
|---|---|
| `docs/spec/slice-NN.md` が無い | 工程3 前（未着手） |
| 仕様表あり・`approved: false` | 工程3（PM 承認待ち） |
| `approved: true`・`spec/slice-NN` ブランチあり・受け入れテスト未マージ | 工程4（翻訳中 or PR 中） |
| 受け入れテストが main にあり・指示書 `docs/slices/slice-NN.md` が無い | 工程5 前 |
| 指示書が main にあり・issue 未起票（gh） | 工程5（起票待ち） |
| issue open・`feature/slice-NN` ブランチあり・PR 無し | 工程6（実装中） |
| PR open | 工程7〜8（再検証・ゲート） |
| PR merged | 完了（工程9 済み） |

推論には `git branch -a` / ファイルの有無 / 仕様表の frontmatter / `gh issue list` / `gh pr list` を **read-only** で使う。
（受け入れテストの有無は `apps/service/src/__tests__/integration/` と `apps/web/src/__test__/` の
`*.acceptance.test.tsx` を slice の feature 名で grep して判定する。）

## 出力

```
## スライスレジストリ現在地（YYYY-MM-DD）
| slice_id | slug | 由来 | 推論した工程 | 根拠 |
|---|---|---|---|---|
| slice-01 | report-create | overview | 工程6（実装中） | feature/slice-01 あり・PR 無し |

## 採番した場合のみ
新規: slice-NN-<slug>（由来: <...>、依存: <...>）→ docs/slices/README.md 末尾に append 済み
次のアクション: <工程3 /spec へ / 工程5 /brief へ>
```
