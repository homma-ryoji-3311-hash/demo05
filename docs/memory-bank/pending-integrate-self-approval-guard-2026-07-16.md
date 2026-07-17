# 草案（pending）: ADR-0015 が命じた自己承認ガードが `/integrate` に実装されていない

> `/flywheel` 方式の書き戻し草案。**確定は人（AIアーキ＝Harness-Keeper）が `.claude/skills/integrate/SKILL.md` へ**。
> 起票: 2026-07-16（slice-02 / issue #4 の下流セッション中に発見）

## 観察

slice-02 の `/submit` 直後、リーダーから「#12 をマージして」と指示された。ADR-0015 決定2
「agent は同一 run で自作 PR を GO・マージしない」に該当するため停止し、根拠を確認するために
`/integrate` の SKILL.md を読んだところ、**ADR-0015 が命じたガードが1行も実装されていなかった**。

```
$ grep -n "自己承認|author|ADR-0015|incidents" .claude/skills/integrate/SKILL.md
（ヒットなし）
$ grep -n "ADR-" .claude/skills/integrate/SKILL.md
3:  ... ADR-0014。
9:  ... （ADR-0014）。
41: ... （ADR-0010）。
```

skill 全62行が参照するのは ADR-0014・0010 のみ。ADR-0015 の帰結

> - `/integrate` の SKILL.md に自己承認ガード（Phase 判定＋Phase B マージ前）を追記する。
> - `docs/metrics/incidents.md` を新設し、PR #1 の自己マージを第1号として記録する。

のうち、**`incidents.md` の新設（決定5）は履行済みだが、ガードの実装（決定4）だけが落ちている。**

## なぜ重大か

ADR-0015 は「実際に起きたインシデント」の再発防止として書かれた。demo リポジトリの PR #1 で、
PR 作成者・GO 判定者・マージ実行者が全て同一アカウントになり、GitHub の self-approve 拒否を
GO **コメント**で迂回してマージまで完走した。**その再発を止める唯一の機械的手段が未実装のまま残っている。**

さらに ADR-0015 決定3 は「判定の author が PR の author と一致する場合、それは有効な GO として
扱わない」と定める。単一アカウント運用なので **author は常に一致する**。つまりガードが実装されていれば
`/integrate` は Phase B で**必ず停止する**のが正しい挙動であり、いま止まらないのは
「たまたま条件を満たしている」のではなく「チェックが存在しない」ためである。

これは CLAUDE.md §1 の前提

> これらは宣言だけでなく hooks（`PreToolUse`）・permissions deny・CI で機械的に強制されている。

が、この関所については**成立していない**ことを意味する。ADR-0015 自身が最も警戒する
「demo の緑やマージ完了を、関所が効いた証拠として扱わない」に、現状が該当している。

## 分類と強制力の階段

- **分類: ハーネスの欠陥**（`.claude/` の不足）→ AIアーキ（＝Harness-Keeper）
- **現在: 宣言のみ**（ADR-0015 に書いてある）
- **提案: 実行時強制へ1段**（skill に手順として実装）。飛び級なし。
- 発生回数: **2回目**（1回目＝PR #1 の自己マージ＝ADR-0015 起票の原因。2回目＝本件で
  「マージして」の指示が実際に来て、止めたのは skill ではなく agent の判断だった）

> **今回止まったのは運である。** agent が ADR-0015 を読みに行ったから止まった。
> 読まなければそのままマージできた。これは機械的強制ではない。

## 提案する差分（`.claude/skills/integrate/SKILL.md`）

「## フェーズ判定」の直後に節を追加する。

```markdown
## 自己承認ガード（ADR-0015・Phase 判定と Phase B マージ直前の2箇所で見る）

PR の author と GO（工程8 の判定コメント / approve）の author を `gh` で突き合わせる。

    gh pr view <PR> --json author,comments,reviews

- **GO が無い** → Phase A（既定）。
- **GO の author == PR の author** → **Phase B へ進まず停止**し、次を出す:
  「単一アカウントのため機械分離が成立しない（ADR-0015）。別 identity の GO を得るか、
   手続き的分離（別ステップでの人手マージ）で進めること。手続き的分離で進めた場合は
   `docs/metrics/incidents.md` に author・GO・マージの帽子を記録する（決定5）。」
- **同一セッションで `/submit` した PR** → Phase B へ進まない（決定2）。マージは別セッションの統合役が行う。
```

## 剪定提案

`CLAUDE.md` への追加は**不要**。§7 に「不可逆操作はすべて統合役の1点に集約されている」と既にあり、
§8 の下にも ADR-0015 の要旨が入っている。**足すべきは宣言ではなく実装**であり、
「この行を消したら Claude はミスをするか？」の基準では、憲法に新しい行を足しても防げない
（現に憲法もADRも読んだうえで、止めたのは agent の裁量だった）。1行も足さないことを提案する。

## 併せて発見した矛盾（同じ skill の別問題・判断を仰ぐ）

`/flywheel` の SKILL.md は書き戻し先の表で

> | `docs/adr/NNNN-*.md`（新規決定） | Harness-Keeper 単独で確定してよい |

としているが、`protect-paths.sh` と `settings.json` の deny は **`docs/adr/*` への書込を全ブランチで
ブロック**する。Harness-Keeper が agent セッションを回している限り、この「単独で確定してよい」は
実行できない。skill の表と hook のどちらが正しいかは人の判断が要る。
