#!/usr/bin/env bash
# 週次リポジトリ統計 — Markdown レポート整形（collect.sh の出力から生成）
# 出力: out/report.md
# 制約: 数値は必ず実データから算出し、推測で埋めない。取得できなかった項目は N/A。
set -euo pipefail

OUT_DIR="${1:-out}"
THRESHOLD_H=48   # ゲート滞留の暫定閾値（CONTEXT.md「ゲート滞留時間」・4〜5週の実測後に較正）

META="$OUT_DIR/meta.json"
PRS="$OUT_DIR/prs.json"
OPEN="$OUT_DIR/open_prs.json"
AUTHORS="$OUT_DIR/authors.tsv"
REPORT="$OUT_DIR/report.md"

WEEK=$(jq -r .week "$META")
SINCE_JST=$(jq -r .since_jst "$META")
UNTIL_JST=$(jq -r .until_jst "$META")

week_pr_count=$(jq 'length' "$PRS")
merged_count=$(jq '[.[] | select(.mergedAt != null)] | length' "$PRS")
open_count=$(jq 'length' "$OPEN")
commit_count=$(awk -F'\t' '{s+=$2} END {print s+0}' "$AUTHORS")
avg_dwell=$(jq -r '
  [.[] | select(.mergedAt != null) | ((.mergedAt|fromdate)-(.createdAt|fromdate))/3600]
  | if length==0 then "N/A" else ((add/length*10|round)/10|tostring) end' "$PRS")

{
  echo "# 週次リポジトリ統計 ${WEEK}"
  echo
  echo "対象期間: ${SINCE_JST} 〜 ${UNTIL_JST}"
  echo
  echo "## サマリ"
  echo
  echo "| 指標 | 値 |"
  echo "|---|---|"
  echo "| 今週の PR（作成またはマージ） | ${week_pr_count}件 |"
  echo "| うちマージ済み | ${merged_count}件 |"
  echo "| オープン中 PR（全体） | ${open_count}件 |"
  echo "| コミット数（全ブランチ） | ${commit_count}件 |"
  echo "| 平均ゲート滞留時間 | ${avg_dwell}h |"
  echo
  echo "## PR 一覧（今週作成またはマージ）"
  echo
  if [ "$week_pr_count" -eq 0 ]; then
    echo "該当なし"
  else
    echo "| PR | タイトル | 作者 | 作成 | マージ | ゲート滞留(h) | 差分 |"
    echo "|---|---|---|---|---|---|---|"
    jq -r '.[] | [
      "#\(.number)",
      (.title | gsub("\\|"; "¦")),
      .author.login,
      (.createdAt | sub("T.*"; "")),
      (if .mergedAt then (.mergedAt | sub("T.*"; "")) else "—" end),
      (if .mergedAt then (((.mergedAt|fromdate)-(.createdAt|fromdate))/3600|floor|tostring) else "—" end),
      "+\(.additions)/-\(.deletions)"
    ] | "| " + join(" | ") + " |"' "$PRS"
  fi
  echo
  echo "## ゲート滞留 ${THRESHOLD_H}h 超"
  echo
  echo "> 層境ゲートのボトルネック候補。2週連続で出たら要相談。"
  echo
  stuck=$(
    jq -r --argjson th "$THRESHOLD_H" '.[]
      | select(.mergedAt != null)
      | select((((.mergedAt|fromdate)-(.createdAt|fromdate))/3600) > $th)
      | "- #\(.number) \(.title | gsub("\\|"; "¦"))（\(.author.login)・滞留 \((((.mergedAt|fromdate)-(.createdAt|fromdate))/3600)|floor)h・マージ済み）"' "$PRS"
    jq -r --argjson th "$THRESHOLD_H" '.[]
      | select(.age_hours > $th)
      | "- #\(.number) \(.title | gsub("\\|"; "¦"))（\(.author.login)・経過 \(.age_hours)h・オープン中）"' "$OPEN"
  )
  if [ -z "$stuck" ]; then echo "該当なし"; else echo "$stuck"; fi
  echo
  echo "## 作者別コミット数"
  echo
  if [ "$commit_count" -eq 0 ]; then
    echo "該当なし"
  else
    echo "| 作者 | コミット |"
    echo "|---|---|"
    awk -F'\t' '{print "| " $1 " | " $2 " |"}' "$AUTHORS"
  fi
} > "$REPORT"

echo "report: $REPORT generated" >&2
