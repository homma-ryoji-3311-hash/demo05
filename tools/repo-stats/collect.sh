#!/usr/bin/env bash
# 週次リポジトリ統計 — データ収集（決定的処理のみ・Claude 不使用）
# 出力: out/meta.json, out/prs.json, out/open_prs.json, out/authors.tsv
# 前提: gh（認証済み）/ jq / git 全履歴（fetch-depth: 0）
# 所有: Harness-Keeper（docs/metrics/README.md と同じ傘）
set -euo pipefail

OUT_DIR="${1:-out}"
mkdir -p "$OUT_DIR"

# --- 集計期間: 前週木曜 00:00 JST 〜 直近木曜 00:00 JST（カレンダー固定・冪等） ---
dow=$(TZ=Asia/Tokyo date +%u)      # 1=月 .. 7=日（木=4）
offset=$(( (dow - 4 + 7) % 7 ))    # 直近の木曜まで戻る日数（木曜実行なら 0）
until_jst=$(TZ=Asia/Tokyo date -d "-${offset} days" +%Y-%m-%d)
since_jst=$(TZ=Asia/Tokyo date -d "${until_jst} -7 days" +%Y-%m-%d)

# 比較は UTC の ISO8601(Z) 文字列で統一（gh の createdAt/mergedAt と同形式）
SINCE=$(date -u -d "${since_jst}T00:00:00+09:00" +%Y-%m-%dT%H:%M:%SZ)
UNTIL=$(date -u -d "${until_jst}T00:00:00+09:00" +%Y-%m-%dT%H:%M:%SZ)
WEEK=$(date -d "${until_jst}" +%G-W%V)

jq -n --arg since "$SINCE" --arg until "$UNTIL" --arg week "$WEEK" \
  --arg since_jst "${since_jst} 00:00 JST" --arg until_jst "${until_jst} 00:00 JST" \
  '{since: $since, until: $until, week: $week, since_jst: $since_jst, until_jst: $until_jst}' \
  > "$OUT_DIR/meta.json"

# --- PR: 対象期間に作成またはマージされたもの ---
# ゲート滞留時間 = createdAt→mergedAt（用語の正本: CONTEXT.md「ゲート滞留時間」）
gh pr list --state all --limit 300 \
  --json number,title,author,createdAt,mergedAt,mergedBy,additions,deletions,state \
  --jq "[.[] | select(
      (.createdAt >= \"$SINCE\" and .createdAt < \"$UNTIL\") or
      (.mergedAt != null and .mergedAt >= \"$SINCE\" and .mergedAt < \"$UNTIL\")
    )]" > "$OUT_DIR/prs.json"

# --- オープン中 PR 全件（滞留の現在値。収集時点基準＝ここだけ非冪等） ---
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
gh pr list --state open --limit 100 \
  --json number,title,author,createdAt \
  --jq "[.[] | . + {age_hours: (((\"$NOW\" | fromdate) - (.createdAt | fromdate)) / 3600 | floor)}]" \
  > "$OUT_DIR/open_prs.json"

# --- コミット: 作者別（対象期間内・全ブランチ） ---
git log --all --since="$SINCE" --until="$UNTIL" --pretty=format:'%an' \
  | sort | uniq -c | sort -rg \
  | awk '{c=$1; $1=""; sub(/^ /,""); print $0 "\t" c}' > "$OUT_DIR/authors.tsv"

echo "collect: week=$WEEK since=$SINCE until=$UNTIL" >&2
