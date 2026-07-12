#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

staged_files=()
while IFS= read -r -d '' file; do
  staged_files+=("$file")
done < <(git diff --cached --name-only -z --diff-filter=ACMR)

if [ "${#staged_files[@]}" -eq 0 ]; then
  echo "pre-commit: no staged files"
  exit 0
fi

matches_ext() {
  case "$1" in
    *.ts | *.tsx | *.js | *.mjs | *.json | *.yml | *.yaml | *.md) return 0 ;;
    *) return 1 ;;
  esac
}

matches_lint_ext() {
  case "$1" in
    *.ts | *.tsx | *.js | *.mjs) return 0 ;;
    *) return 1 ;;
  esac
}

run_prettier() {
  local files=()
  local file

  for file in "${staged_files[@]}"; do
    if matches_ext "$file"; then
      files+=("$file")
    fi
  done

  if [ "${#files[@]}" -eq 0 ]; then
    echo "prettier: no matching staged files"
    return 0
  fi

  pnpm exec prettier --check "${files[@]}"
}

run_eslint_for_root() {
  local root="$1"
  local files=()
  local file
  local relative

  for file in "${staged_files[@]}"; do
    case "$file" in
      "$root"/*)
        if matches_lint_ext "$file"; then
          relative="${file#"$root"/}"
          files+=("$relative")
        fi
        ;;
    esac
  done

  if [ "${#files[@]}" -eq 0 ]; then
    echo "eslint ($root): no matching staged files"
    return 0
  fi

  (
    cd "$root"
    pnpm exec eslint --no-warn-ignored "${files[@]}"
  )
}

pnpm exec secretlint "${staged_files[@]}"
run_prettier
run_eslint_for_root "apps/web"
run_eslint_for_root "apps/service"
