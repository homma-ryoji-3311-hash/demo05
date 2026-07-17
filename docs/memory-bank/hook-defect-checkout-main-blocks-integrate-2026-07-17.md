# hook 欠陥: main への checkout ガードが逆を向いていた（統合役の工程9b をブロック・強制 checkout を素通し）

> 起票日: 2026-07-17 / 発覚: PR #23 のマージ時（`/integrate 23` Phase B）
> 状態: **解決済み。** 厳格化（`-f` 素通しの穴）は PR #29。**緩和（素の checkout 許可）は人間が適用**（PR #31・下記「適用の記録」）。

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

## 適用の記録（2026-07-17・PR #31）

**緩和は人間（PM）が自分の手で適用した。** 下記の差分を削除し、エージェントはその結果を検証・コミットしただけである。

適用後の実測（実環境の hook を直接叩いた結果）:

```
=== 緩和の目的: 工程9b が開くか ===
  allow (exit 0) : git checkout main   <- 工程9b が実行可能に
  allow (exit 0) : git switch main
  allow (exit 0) : git checkout master

=== 3層の保護が無傷か ===
  block (exit 2) : git checkout -f main
  block (exit 2) : git push --force origin main
  block (exit 2) : git reset --hard origin/main
  block (exit 2) : rm -rf /tmp/x
  block (exit 2) : prisma migrate dev
```

**これで工程9b が初めて実行可能になる。** ADR-0014 の定義以来、このプロジェクトで一度も走っていない工程である。

### 【重要】緩和が fail-open を露出させた — Phase A で発見・同 PR で修正

**「あの4行は冗長」という当初の分析は誤りだった。**

本ドキュメントは当初「main 上での作業は commit / push / ファイル書込の3層が既に止めているから checkout ガードは冗長」と書いた。**しかしその3層はすべて「コマンド送信時のブランチ」で判定する。** したがって移動を先に挟まれると効かない:

```
現在ブランチ: chore/x（COMMITTABLE=1）から複合コマンドを投げる

素通り : git checkout main && git push              <- main へ push できる
素通り : git checkout main && git commit -m x
素通り : git checkout main; git push
素通り : git checkout main && git commit -m x && git push
```

素の `git push` は `PUSH_ARGS` が空になるため main/force/refspec のどのガードにも当たらず、**upstream の main へ push される**。CLAUDE.md §1-1 の絶対禁止を破れる。

**削除した checkout ガードは、この経路を偶然塞いでいた。** 本来の目的（main 上での作業防止）とは別に、複合コマンドで main へ移動する経路ごと止めていたためである。

発見の経緯: Phase A 再検証で「3層が本当に止めるか」を実際に踏んだところ、main 上での commit が **hook ではなく git のファイルロックエラーで失敗**した。hook が止めていれば `BLOCKED:` が出るはずで、出ないこと自体が兆候だった。**偶然の Windows エラーが無ければ、この穴に気づかずマージしていた可能性が高い。**

**対策（同 PR に追加）**: 移動そのものは許可し、**移動と変更操作（commit / push / merge）を同一コマンドに束ねること**を禁じた。危険なのは移動ではなく束ねること。工程9b は素の checkout を単体で叩くため影響を受けない。

回帰テスト: `.claude/hooks/tests/main-guard-compound-evasion.test.sh`（2つの送信元ブランチ × 12ケース）。

**教訓**: 「このガードは冗長だから消してよい」という判断は、**冗長性の根拠となる他のガードが、どの時点の状態で判定しているか**まで確認しないと成立しない。3層あっても、3層すべてが同じ前提（送信時のブランチ）に乗っていれば、その前提を崩す一手で全部が無効になる。

### 適用時に発覚した別件（テストが環境で嘘をつく）

PM が PowerShell から `bash .claude/hooks/tests/destructive-checkout-force.test.sh` を実行したところ、**全ガードが素通り（exit 0）**という結果が出た。しかし同じテストを Git Bash で走らせると 20/20 PASS し、実環境の hook も正常だった（上の実測）。

症状から、`run_hook` が hook へ渡す stdin が空になり `PAYLOAD=""` → `CMD=""` → どの正規表現にも当たらず `exit 0` に落ちたと推測される。PM の出力で唯一 block していたのが `protect-paths.sh`（stdin ではなく `file_path` を見る別ファイル）だったことと整合する。

**ハーネスのテストが環境依存で、しかも fail-open 方向に嘘をつく。** #24（Windows での lint 誤検知）と同じ class だが、あちらは「安全側に嘘をつく（狼少年）」のに対し、こちらは「**危険側に嘘をつく**」ため深刻度が高い。別途 issue 化すること。

## 参考: 当時の未了記述（履歴として残す）

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
