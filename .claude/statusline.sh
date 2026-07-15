#!/usr/bin/env bash
# statusline.sh — Claude Code の statusLine 用。全スライス進捗を1行で「人間向け」に表示する。
# read-only。モデル文脈は一切消費しない（statusLine は presentational・docs 準拠）。
# stdin に session JSON（model / workspace.current_dir 等）が来るが git ブランチは含まれない
# ため、ブランチは自前で解決する。
#
# 置き場所: リポジトリの .claude/statusline.sh（このファイルをそこへコピーする）
# 有効化:  chmod +x .claude/statusline.sh ＋ .claude/settings.json に statusLine エントリを追加
set -uo pipefail

cat >/dev/null 2>&1 || true   # stdin(JSON) は使わないので読み捨てる（broken pipe 回避）

# ROOT はスクリプト位置（.claude/statusline.sh）の1つ上＝リポジトリルート。
# CLAUDE_PROJECT_DIR に依存しない（statusLine では未設定のことがある）。
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)"
[ -z "${ROOT:-}" ] && exit 0
RENDER="$ROOT/tools/slice-aggregator/scripts/render_overview.py"
[ -f "$RENDER" ] || exit 0

# python3 優先、無ければ python
PY=python3
command -v python3 >/dev/null 2>&1 || PY=python

# 作業中スライスをブランチ名から解決（feature/slice-NNNN-* または spec/slice-NNNN）。
# スライスブランチでなければ SLICE_ARGS は空＝作業中行は出さない（誤表示より非表示）。
BRANCH="$(git -C "$ROOT" branch --show-current 2>/dev/null || true)"
SLICE_ARGS=()
if [[ "$BRANCH" =~ ^(feature|spec)/slice-0*([0-9]+) ]]; then
  SLICE_ARGS=(--slice-id "${BASH_REMATCH[2]}")
fi

"$PY" "$RENDER" --statusline "${SLICE_ARGS[@]}" 2>/dev/null || echo "📊 進捗 取得失敗"
