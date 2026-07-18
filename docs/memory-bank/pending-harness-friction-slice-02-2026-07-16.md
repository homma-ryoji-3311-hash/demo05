# 草案（pending）: slice-02 で観測したハーネス摩擦3件

> `/flywheel` 方式の書き戻し草案。**確定は人（AIアーキ＝Harness-Keeper）**。
> 起票: 2026-07-16（slice-02 / issue #4 の下流セッション中）
>
> **3件のうち提案は1件だけ。** 残り2件は 2ストライク未成立／根本原因未特定のため、
> 意図的に「観察のまま」置く（`docs/memory-bank/README.md` の起票基準に従う。1回では起票しない）。

---

## 1. `commitlint-title` が存在しない Jira 課題キーを要求している ← 提案あり

### 観察

`.github/workflows/lint-pr.yml` が PR タイトルを `commitlint.pr.config.ts` で検証し、
末尾に `[SRP-<番号>]` を必須にしている。**しかしこのリポジトリに Jira 課題は存在しない**
（`docs/` にも issue にも SRP の痕跡なし）。結果、**全 PR で fail し続けている**。

| PR | commitlint-title | 結末 |
|---|---|---|
| #11 feature/slice-01 | **fail** | マージ済み |
| #12 spec/slice-02 | **fail** | マージ済み |
| #13 feature/slice-02 | **fail** | — |

設定のコメントは
「squash マージ時に PR タイトルがコミットメッセージになるため、ここでのみ Jira 課題キーを必須にする」
と書くが、**実際の運用はマージコミット**（`git log origin/main --merges` に #2・#10・#11・#12）で、
squash は使われていない。前提そのものが実態と違う。

### なぜ放置できないか

**常に赤いゲートは、赤を無視する文化を作る。** 実際 #11 では `typecheck` の fail も同時に
無視されてマージされている。CLAUDE.md §6 の

> **Claude Code は勢いを承認と誤解する。** 「Worked」「Cooked」の表示は成功の証拠ではない。

の裏返しで、**「いつもの赤」が本物の赤を隠す**。人も agent も PR checks を見なくなる。

さらに agent 側に副作用がある。緑にする唯一の方法が「実在しない課題番号を捏造する」ことなので、
**規約を守ろうとすると嘘をつくことになる**。今回は捏造せず fail のまま上げたが、
別の agent が `[SRP-1]` と書いて緑にする経路が開いている。

### 分類と強制力の階段

- **分類: ハーネスの欠陥** → AIアーキ
- **現在: 事後検証（CI）はあるが実効性ゼロ**（全 PR で fail し、誰も従わない）
- **提案: 昇格ではなく撤去または修正。** 階段は「上げる」だけでなく「実態に合わせる」方向もある。
- 発生回数: **3回目**（#11・#12・#13）

### 提案する差分（`commitlint.pr.config.ts`）

Jira を使う予定が無いなら、ルールごと外す:

```diff
 const config: UserConfig = {
   ...base,
-  rules: {
-    ...base.rules,
-    'subject-jira-key': [2, 'always'],
-  },
 };
```

Jira を将来使う予定があるなら `[2, 'always']` → `[1, 'always']`（warning）に落とし、
**squash 前提のコメントも実態（マージコミット運用）に合わせて直す**。
どちらを採るかは PM／AIアーキの判断。**「常に赤のまま放置」だけは選ばないでほしい。**

---

## 2. dev サーバーが起動しなくなる（根本原因未特定・提案なし）

### 観察

セッション後半、`apps/service` と `apps/web` の dev サーバーが起動しなくなった。

| 時点 | 実測 |
|---|---|
| セッション序盤 | backend 約2分／Vite **61.5秒**（`bootTimeoutMs` 60秒を僅かに超過） |
| 中盤 | Vite `ready in 1028805 ms` = **17分** |
| 終盤 | backend 13分経っても listening せず。**CPU 0秒・読込 0バイト** |

`harness_start` は**ほぼ毎回** `ready: false` ＋「bootTimeoutMs 以内に ready になりませんでした」を返すが、
実際には後から起動している。**起動失敗と誤読しやすい。**

### 検証した仮説と結果

| 仮説 | 検証 | 結果 |
|---|---|---|
| node プロセスが積み上がって競合 | `Get-CimInstance Win32_Process` で全数調査 | **否定。** 残存17本は全て正当（Zed エディタ＋当セッションの MCP サーバー群）。ハーネスの残骸は0 |
| McAfee のリアルタイムスキャンが I/O を阻害 | スキャンを15分無効化して再起動 | **否定。** 9分間まったく変化なし |
| CPU 負荷 | プロセスの CPU 時間を測定 | **否定。** 13分で CPU 0.4秒＝計算していない |

**CPU 0・I/O 0 で停止**＝スキャンによる低速化ではなく、何かを待つブロック状態。
`git rebase` も `unable to append to '.git/logs/HEAD': Permission denied` で失敗しており、
ファイルロック系の疑いは残るが**特定できていない**。`harness_stop` が毎回 `exitCode: 1` を返す点も未調査。

### 提案しない理由

根本原因が分からないまま `bootTimeoutMs` を伸ばすのは**症状を隠すだけ**で、
「起動しない」と「遅い」を区別できなくなる。**まず原因の特定が要る**（Harness-Keeper の調査項目）。

ただし1点だけ確かなのは、**`bootTimeoutMs`（backend 120秒／frontend 60秒）は
最良時の実測（2分／61.5秒）すら下回っている**こと。原因特定後、実測に基づく値へ改める。

---

## 3. push 済みブランチの rebase が force-push 禁止と両立しない（1回目・提案なし）

### 観察

リーダーの指示で `feature/slice-02` を `origin/main` へ rebase しようとして、2つの guardrail に阻まれた。

1. **rebase 中は HEAD が detached** → `pre-tool-use-bash.sh` が
   「BLOCKED: git commit（現在ブランチ: ）」で fail-closed ブロック。hook の設計は正しい
   （ブランチを特定できないときは止める側に倒す）が、rebase の replay を通せない。
2. **rebase 後の push は force が必須**だが、hook は `--force` / `-f` を全面 deny。
   **push 済みブランチを rebase したら、その結果を反映する手段が無い。**

`git merge origin/main`（GitHub の "Update branch" と同じ）に切り替えて解決した。
HEAD がブランチに留まるので hook を通り、履歴を書き換えないので素の push で反映できる。

### 提案しない理由

**1回目**。`docs/memory-bank/README.md` の起票基準「同じ修正指示を2回したら起票する。
1回では起票しない（肥大化防止）」に従い、宣言化を見送る。

次に同じ衝突が起きたら、`CLAUDE.md` §6（非自明な落とし穴）へ

> **push 済みブランチを rebase しない。** force-push は禁止されており、rebase の結果を反映できない。
> main を取り込むときは `git merge origin/main`（GitHub の "Update branch" と同じ）を使う。

の1行を提案する。**その時は §6 から1行削る提案とセットにする**（目標 ~150行・上限 200行）。
