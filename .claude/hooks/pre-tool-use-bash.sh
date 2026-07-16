#!/usr/bin/env bash
# PreToolUse(Bash): 不可逆・高コスト操作の deny-list。
# 「宣言と機械的強制のペア設計」の強制側。CLAUDE.md §1 と同じルールを機械で張る。
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PAYLOAD="$(cat)"
CMD="$(json_field "$PAYLOAD" "d.get('tool_input',{}).get('command')")"
[[ -z "$CMD" ]] && CMD="$PAYLOAD"   # python3 が無い環境では生 JSON を対象にする（fail-closed 側）

deny() { block "PreToolUse:Bash" "$1"; }

# --- main を進める操作の禁止（CLAUDE.md §1-1） ---
# 作業ブランチ（feature/slice-NN / spec/slice-NN、NN=/board 採番）での commit / push は許可されている。
# 許可を狭く定義するホワイトリスト方式（誤検知は止まる側に倒す＝fail-closed）。
BRANCH="$(current_branch)"   # unborn/detached 安全（lib.sh）。空文字は非作業ブランチ扱い＝fail-closed
WORK_BRANCH=0
[[ -n "$(slice_branch_layer "$BRANCH")" ]] && WORK_BRANCH=1   # 番号必須（lib.sh）

# 作業ブランチに加え、土台/harness の chore/* ブランチも agent の commit / 素の push を許可する
# （案a・2026-07-16 PM 決定。方式B で土台インフラを main へ先行 land する運用に対応）。
# main を進める・force・delete・refspec 指定の push は下のガードで引き続きブロックされる（変更なし）。
COMMITTABLE="$WORK_BRANCH"
[[ "$BRANCH" =~ ^chore/.+ ]] && COMMITTABLE=1

if [[ "$CMD" =~ (^|[[:space:];&|])git[[:space:]]+commit ]]; then
  if [[ "$COMMITTABLE" -ne 1 ]]; then
    deny "BLOCKED: git commit（現在ブランチ: ${BRANCH}）。
commit が許可されるのは作業ブランチ（feature/slice-NN / spec/slice-NN、NN=/board 採番）と土台の chore/* のみ（CLAUDE.md §1-1）。
main を進める操作は統合役ただ1人。/pickup で作業ブランチを切ってから作業すること。"
  fi
fi

if [[ "$CMD" =~ (^|[[:space:];&|])git[[:space:]]+push ]]; then
  PUSH_ARGS="${CMD#*push}"
  if [[ "$COMMITTABLE" -ne 1 ]]; then
    deny "BLOCKED: git push（現在ブランチ: ${BRANCH}）。
push が許可されるのは作業ブランチ（feature/slice-NN / spec/slice-NN、NN=/board 採番）からのみ（CLAUDE.md §1-1）。"
  fi
  if [[ "$PUSH_ARGS" =~ (^|[[:space:]])(main|master)([[:space:]]|$) ]] \
  || [[ "$PUSH_ARGS" =~ --force ]] \
  || [[ "$PUSH_ARGS" =~ (^|[[:space:]])-f([[:space:]]|$) ]] \
  || [[ "$PUSH_ARGS" =~ --delete ]] \
  || [[ "$PUSH_ARGS" =~ (^|[[:space:]])-d([[:space:]]|$) ]] \
  || [[ "$PUSH_ARGS" =~ : ]]; then
    deny "BLOCKED: main を進める・書き換える push は統合役ただ1人（CLAUDE.md §1-1）。
許可されるのは作業ブランチへの素の push（例: git push -u origin ${BRANCH}）のみ。
force / delete / refspec 指定 / main・master を含む push はブロックされる。"
  fi
fi

# --- 破壊的 git ---
if [[ "$CMD" =~ git[[:space:]]+reset[[:space:]]+--hard ]] \
|| [[ "$CMD" =~ git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f ]] \
|| [[ "$CMD" =~ git[[:space:]]+branch[[:space:]]+-D ]] \
|| [[ "$CMD" =~ git[[:space:]]+checkout[[:space:]]+(--[[:space:]])?\. ]]; then
  deny "BLOCKED: 破壊的な git 操作。作業結果を消す前に人に相談すること。
やり直したい場合はセッションを捨てて /pickup から再開する（CLAUDE.md §4）。"
fi

# --- ファイル破壊 ---
if [[ "$CMD" =~ rm[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*r[a-zA-Z]*f ]] \
|| [[ "$CMD" =~ rm[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*f[a-zA-Z]*r ]]; then
  deny "BLOCKED: rm -rf。不可逆操作。削除が必要ならリーダーへ質問として出して停止すること。"
fi

# --- DB マイグレーション / スキーマ変更 ---
if [[ "$CMD" =~ (prisma[[:space:]]+migrate|typeorm[[:space:]]+migration|knex[[:space:]]+migrate|run[[:space:]]+migrate|flyway|liquibase) ]] \
|| [[ "$CMD" =~ (DROP|TRUNCATE|ALTER)[[:space:]]+TABLE ]] \
|| [[ "$CMD" =~ (DROP|TRUNCATE|ALTER)[[:space:]]+table ]]; then
  deny "BLOCKED: DB マイグレーション / スキーマ変更。層境（不可逆変更）の操作。
実行は統合役、GO/NO-GO 判断は PM（代理: リーダー1名・記録必須。ADR-0007）。差分に必要性を書いて停止すること。"
fi

# --- main ブランチ上での作業（高速フェイル。正本は GitHub ブランチ保護） ---
if [[ "$CMD" =~ git[[:space:]]+(checkout|switch)[[:space:]]+(main|master)([[:space:]]|$) ]]; then
  deny "BLOCKED: main への checkout。作業は feature/slice-<issue> のみ（CLAUDE.md §1）。"
fi

# --- 実データ・DBダンプの持ち込み（合成フィクスチャのみ。§6 機密データ） ---
if [[ "$CMD" =~ (pg_dump|mysqldump) ]] \
|| [[ "$CMD" =~ fixtures/real ]]; then
  deny "BLOCKED: 実データ / DB ダンプの持ち込み。dev は合成フィクスチャのみ（例外なし）。
バグ再現も合成データで作ること（CLAUDE.md §1-5）。"
fi

# --- 権限バイパス（暴走対策の第一則） ---
if [[ "$CMD" =~ bypassPermissions ]] || [[ "$CMD" =~ --dangerously-skip-permissions ]]; then
  deny "BLOCKED: permission バイパスは全ロールで禁止（CLAUDE.md §1-7）。"
fi

hook_log "PreToolUse:Bash" "allow" "ok"
exit 0
