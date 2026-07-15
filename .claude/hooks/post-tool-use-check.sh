#!/usr/bin/env bash
# PostToolUse(Edit|Write): 非ブロッキング feedback。
# 「ブロック型は少数の致命事項のみ、それ以外は feedback 注入」の使い分け（計画書 §6）。
# 型エラー・lint エラーをモデルに返すだけで、作業は止めない。
# staff-report は pnpm workspace のモノレポ。変更ファイルの属するパッケージ内で検査する。
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PAYLOAD="$(cat)"
FILE="$(json_field "$PAYLOAD" "d.get('tool_input',{}).get('file_path')")"
REL="${FILE#$PROJECT_DIR/}"

# TS/TSX 以外は何もしない
case "$REL" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# 変更ファイルの属するパッケージを特定する
APP=""
case "$REL" in
  apps/service/*) APP="apps/service" ;;
  apps/web/*)     APP="apps/web" ;;
  packages/*)     APP="$(printf '%s' "$REL" | cut -d/ -f1-2)" ;;
  e2e/*)          APP="e2e" ;;
esac

FEEDBACK=""

# 1. フォーマット（pre-commit と同じ整形をエージェント内でも回し、diff ノイズを減らす）
if [[ -f "${PROJECT_DIR}/node_modules/.bin/prettier" ]]; then
  "${PROJECT_DIR}/node_modules/.bin/prettier" --write "$FILE" >/dev/null 2>&1 || true
fi

if [[ -n "$APP" && -d "${PROJECT_DIR}/${APP}" ]]; then
  # 2. 型チェック（パッケージ単位。--noEmit / -b は各 package.json の typecheck に従う）
  if [[ -f "${PROJECT_DIR}/${APP}/package.json" ]] && command -v pnpm >/dev/null 2>&1; then
    TSC_OUT="$(cd "${PROJECT_DIR}/${APP}" && pnpm run --silent typecheck 2>&1 | head -20)"
    if [[ -n "$TSC_OUT" ]]; then
      FEEDBACK="${FEEDBACK}
[typecheck: ${APP}] 型エラーが残っています。推測で any を入れず、原因の型を直してください。
${TSC_OUT}"
    fi
  fi

  # 3. lint（変更ファイルのみ）
  if [[ -f "${PROJECT_DIR}/${APP}/node_modules/.bin/eslint" ]]; then
    LINT_OUT="$(cd "${PROJECT_DIR}/${APP}" && ./node_modules/.bin/eslint "$FILE" --no-warn-ignored 2>&1 | head -20)"
    if [[ -n "$LINT_OUT" ]]; then
      FEEDBACK="${FEEDBACK}
[eslint: ${APP}] ${LINT_OUT}"
    fi
  fi
fi

if [[ -n "$FEEDBACK" ]]; then
  hook_log "PostToolUse" "feedback" "typecheck/eslint findings on $REL"
  additional_context "PostToolUse" "$FEEDBACK"
fi
exit 0
