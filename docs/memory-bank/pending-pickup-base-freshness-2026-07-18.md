# pending: /pickup は最新 origin/main から切る — 2026-07-18

/flywheel 草案④。分類: **ハーネスの欠陥**（/pickup の手順）。

## 観察（slice-06 の実害）

`feature/slice-06` が **slice-04 マージ前の main（053dd66 の親 56e1a22）** から切られていた。作業ツリーに slice-04 の成果（`r_other` seed・`LoadOwnedReportUseCase` の所有権403・一覧）が見えず、下流が「slice-04 が 403 を punt した」と誤認して **reports 403/seed を二重実装**。統合時に `git merge origin/main` で slice-04 版を取り込み、重複を破棄する手戻りが発生した（PR #40）。

## 真因

旧 `/pickup` 手順3 は「`feature/slice-<issue>` が無ければ **`main` から切る**」だった。ここでの `main` は
**ローカル main** で、他スライスのマージに遅れる。依存スライスが merged でもローカル base が古ければ、その成果を取り込めない。

## 修正（実装済み・chore/flywheel-2026-07-18b）

`.claude/skills/pickup/SKILL.md` 手順3 を更新:
- **先に `git fetch origin`**。
- **`origin/main` を基点に切る**（`git checkout -b feature/slice-<issue> origin/main`）。
- 指示書「依存」のスライスが **gh 上で未マージ**なら着手せずリーダーへ報告。

## 強制力の階段（1段）

- 現在: 宣言（skill 本文）。
- 次段候補（人が判断）: pre-tool-use / PostToolUse hook で「feature ブランチ作成時に base が origin/main か」を検査し、
  遅れていれば警告 or ブロック（実行時強制へ昇格）。まず宣言で様子を見る（2ストライク・飛び級しない）。

## 関連

[[slice-06-depends-on-slice-04-merge]]（記憶）。rebase がエディタの `.git/logs/HEAD` ロックで落ちる環境では
merge で取り込む（`pending-stopgate-false-positive-2026-07-18.md` と同セッションの環境知見）。
