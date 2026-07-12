#!/usr/bin/env bash
set -euo pipefail

if command -v lefthook >/dev/null 2>&1; then
  lefthook install "$@"
else
  pnpm exec lefthook install "$@"
fi

pre_commit_hook="$(git rev-parse --git-path hooks/pre-commit)"

if [ ! -f "$pre_commit_hook" ]; then
  exit 0
fi

if grep -q 'call_lefthook run "pre-commit" --no-stage-fixed "$@"' "$pre_commit_hook"; then
  exit 0
fi

tmp_hook="${pre_commit_hook}.tmp"
sed 's/call_lefthook run "pre-commit" "$@"/call_lefthook run "pre-commit" --no-stage-fixed "$@"/' \
  "$pre_commit_hook" > "$tmp_hook"
chmod +x "$tmp_hook"
mv "$tmp_hook" "$pre_commit_hook"
