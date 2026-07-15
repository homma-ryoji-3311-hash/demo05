#!/usr/bin/env bash
# statusline.sh — Claude Code の statusLine 用。現在地を1行で「人間向け」に表示する。
# read-only・自己完結（外部ツール非依存）。モデル文脈は一切消費しない。
# stdin に session JSON が来るが使わない（git ブランチは含まれないため自前で解決）。
#
# 表示例:
#   📊 slice-01 [feature] ✎3 ↑1 📋5   … 作業ブランチ・未コミット3・main より1先行・登録スライス5
#   📊 main ✎2                         … 非スライスブランチ
#
# 旧版は tools/slice-aggregator/scripts/render_overview.py に依存していたが、
# 同ツールはハーネスキットに同梱されず常に no-op だったため、本スクリプトへ内製化した。
set -uo pipefail

cat >/dev/null 2>&1 || true   # stdin(JSON) は読み捨てる（broken pipe 回避）

# ROOT はスクリプト位置（.claude/statusline.sh）の1つ上＝リポジトリルート。
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)"
[ -z "${ROOT:-}" ] && exit 0
command -v git >/dev/null 2>&1 || { echo "📊"; exit 0; }

BRANCH="$(git -C "$ROOT" branch --show-current 2>/dev/null || true)"
[ -z "$BRANCH" ] && { echo "📊 (detached/unborn)"; exit 0; }

# 作業スライスをブランチ名から解決（feature|spec/slice-NN[-...]）。
LAYER=""; SLICE=""
if [[ "$BRANCH" =~ ^(feature|spec)/slice-0*([0-9]+) ]]; then
  LAYER="${BASH_REMATCH[1]}"
  SLICE="slice-$(printf '%02d' "${BASH_REMATCH[2]}")"
fi

# 未コミット数（porcelain の行数）。
DIRTY="$(git -C "$ROOT" status --porcelain 2>/dev/null | grep -c . || true)"
DIRTY_S=""; [ "${DIRTY:-0}" -gt 0 ] 2>/dev/null && DIRTY_S=" ✎${DIRTY}"

# main への先行コミット数（作業ブランチのとき）。
AHEAD_S=""
if [ -n "$SLICE" ]; then
  AHEAD="$(git -C "$ROOT" rev-list --count main.."$BRANCH" 2>/dev/null || true)"
  [ "${AHEAD:-0}" -gt 0 ] 2>/dev/null && AHEAD_S=" ↑${AHEAD}"
fi

# スライスレジストリの登録件数（docs/slices/README.md の slice-NN 行の概数）。
REG_S=""
REG_FILE="$ROOT/docs/slices/README.md"
if [ -f "$REG_FILE" ]; then
  N="$(grep -coE 'slice-[0-9]+' "$REG_FILE" 2>/dev/null || true)"
  [ "${N:-0}" -gt 0 ] 2>/dev/null && REG_S=" 📋${N}"
fi

if [ -n "$SLICE" ]; then
  echo "📊 ${SLICE} [${LAYER}]${DIRTY_S}${AHEAD_S}${REG_S}"
else
  echo "📊 ${BRANCH}${DIRTY_S}${REG_S}"
fi
exit 0
