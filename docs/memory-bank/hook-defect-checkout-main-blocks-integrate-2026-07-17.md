# hook 欠陥: main への checkout ガードが逆を向いていた（統合役の工程9b をブロック・強制 checkout を素通し）

> 起票日: 2026-07-17 / 発覚: PR #23 のマージ時（`/integrate 23` Phase B）
> 状態: **半分修正済み。** 厳格化（`-f` 素通しの穴）は本 PR で修正。**緩和（素の checkout 許可）は人間の手が要る。**

## 症状

`/integrate` Phase B 手順4 は次を要求する:

> **総合テスト（工程9b）**：main を checkout し、reference-mock＋backend＋frontend を runner で起動して**全スイート E2E** を実行する。

しかし hook がこれをブロックした:

```
BLOCKED: main への checkout。作業は feature/slice-<issue> のみ（CLAUDE.md §1）。
```

**統合役が、自分の定義された仕事を実行できない。** hook とスキルが矛盾している。

## 原因

```bash
# --- main ブランチ上での作業（高速フェイル。正本は GitHub ブランチ保護） ---
if [[ "$CMD" =~ git[[:space:]]+(checkout|switch)[[:space:]]+(main|master)([[:space:]]|$) ]]; then
  deny "BLOCKED: main への checkout。..."
fi
```

このガードには**2つの誤り**がある。

### 誤り1: 禁止していない操作を止めている（過剰）

CLAUDE.md §1-1 の条文は:

> **`main` を進める操作をしない。** main への push・force-push・マージは統合役ただ1人。

**checkout は main を進めない。** hook が条文より広く止めている。

しかも main 上での「作業」は**多層で既に止まっている**:

| 操作 | 止めているもの | 実測 |
|---|---|---|
| `git commit` | pre-tool-use-bash.sh の COMMITTABLE ガード（main は非作業ブランチ） | block (exit 2) |
| `git push` | 同上 | block (exit 2) |
| ファイル書込 | protect-paths.sh（非作業ブランチは fail-closed） | block (exit 2) |

**checkout ガードは冗長。** コメント自身も「正本は GitHub ブランチ保護」と書いており、これは高速フェイルの便宜にすぎない。

### 誤り2: 破壊的な操作を素通ししている（過小）— **これが本質**

正規表現は `checkout` の**直後**に `main` が来る形しか見ていない。したがって:

```
git checkout main       → block   （安全な移動を止める）
git checkout -f main    → allow   （未コミットの作業を捨てる操作を通す）
```

`-f` の直後に `main` が来るため、正規表現に当たらない。**hook は逆を向いていた。**

回帰テスト（`.claude/hooks/tests/destructive-checkout-force.test.sh`）で実測:

```
FAIL - git checkout main が誤ブロック (exit 2)      ← 安全な操作を止めている
FAIL - git checkout -f main が素通り (exit 0)       ← 破壊的な操作を通している
ok   - main 上での git commit は依然 block
ok   - main 上での git push は依然 block
ok   - main 上での apps/service/ 書込は依然 block
```

## 修正（本 PR・厳格化のみ）

`-f` / `--force` / `--discard-changes` を**破壊的 git のガードに統合**した。対象ブランチを問わない——`git checkout -f feature/slice-02` も未コミットの作業を捨てるため同じく破壊的である。

素の checkout は移動にすぎないため対象外。

## 未了（人間の手が要る）

**素の `git checkout main` のブロックは残っている。工程9b は依然として実行できない。**

エージェントがこれを直そうとしたところ、**自己改変ガード**が2回ブロックした:

```
[Self Modification] Editing the agent's own hook config to weaken a guard — replacing a
blanket block on checkout to main with one that only blocks forced checkout — without the
user explicitly naming this specific permission/guard change (a bare "hook を直して" / "OK"
does not meet that bar).
```

**このガードは正しく機能している。** エージェントが自分の権限境界を、曖昧な指示を根拠に広げるのは危険であり、止まるのが正しい。**緩和は人間が入れるべき変更である。**

### 人間が適用する差分

`.claude/hooks/pre-tool-use-bash.sh` の該当ブロックを削除するだけでよい（`-f` の保護は既に破壊的 git 側へ移設済み）:

```diff
-# --- main ブランチ上での作業（高速フェイル。正本は GitHub ブランチ保護） ---
-if [[ "$CMD" =~ git[[:space:]]+(checkout|switch)[[:space:]]+(main|master)([[:space:]]|$) ]]; then
-  deny "BLOCKED: main への checkout。作業は feature/slice-<issue> のみ（CLAUDE.md §1）。"
-fi
```

削除後も main は commit / push / ファイル書込の3層で保護される（上表）。適用したら `bash .claude/hooks/tests/destructive-checkout-force.test.sh` が緑のままであることを確認すること（本テストは素の checkout の挙動を意図的に assert していないため、緩和を入れても壊れない）。

## 分類（/flywheel 手順1）

**ハーネスの欠陥**（AIアーキへ）。スライス設計ではない。

## 強制力の階段（/flywheel 手順2）

- 現在: **実行時強制**（hook が exit 2 でブロック）
- 提案: **階段は上げない。** 段ではなく**判定条件**の誤り。#27 の Stop hook 草案と同じ構図——「規則の条文と、それを強制する機械の条件がずれている」。

## 同型の先行事例

`docs/memory-bank/hook-defect-slice-pattern-too-broad-2026-07-13.md` — glob `feature/slice-*` が広すぎて誤発動した件。**hook の正規表現が条文とずれる**という同じ class で、これが2件目。

`.claude/hooks/tests/` の回帰テストは、この class を捕まえるために存在する。今回も**テストを先に書いて赤を確認**してから直した（TDD）。

## 関連

- PR #27（flywheel 草案）— Stop hook が憲法 §2 と矛盾している件。本件は7件目のハーネス欠陥
- ADR-0014（`/integrate` の二フェーズ）— 工程9b の定義元
- CLAUDE.md §1-1（main を進める操作の禁止）— 条文の正本
