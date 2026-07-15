#!/usr/bin/env bash
# PreToolUse(Edit|Write|NotebookEdit): 書込権を「ブランチ名」で判定する（ADR-0004）。
#
#   spec/slice-NN   … 受け入れテスト（acceptance 層）と docs/spec/ を書ける。実装は書けない。
#                     ただし docs/spec/slice-NN.md に approved: true が無ければ
#                     受け入れテストへの書込はブロック（ADR-0012 の Phase ゲート）。
#   feature/slice-NN… 実装を書ける。受け入れテストは read-only。
#
# staff-report での「受け入れテスト＝仕様」の対応（ADR-0001 の翻訳。answer key は docs/画面仕様）:
#   API 層: apps/service 配下の *.integration.test.ts / __tests__/integration/ 配下
#   UI 層 : apps/web/src/__test__ 配下の *.acceptance.test.ts(x) ／ e2e/ 配下（Playwright 導入後）
#
# 「人の役職」で判定しない。役職ベースだと、AIアーキが下流セッションを回した瞬間に穴が開く。
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PAYLOAD="$(cat)"
FILE="$(json_field "$PAYLOAD" "d.get('tool_input',{}).get('file_path') or d.get('tool_input',{}).get('notebook_path')")"
[[ -z "$FILE" ]] && FILE="$PAYLOAD"
REL="${FILE#$PROJECT_DIR/}"

BRANCH="$(current_branch)"   # unborn/detached 安全（lib.sh）。空文字は下の *) で fail-closed

# is_acceptance <相対パス> : 受け入れテスト（＝仕様・二層）なら 0 を返す
is_acceptance() {
  case "$1" in
    apps/service/*.integration.test.ts|apps/service/*.integration.test.tsx) return 0 ;;
    apps/service/*__tests__/integration/*) return 0 ;;
    apps/web/src/__test__/*.acceptance.test.ts|apps/web/src/__test__/*.acceptance.test.tsx) return 0 ;;
    e2e/*) return 0 ;;
  esac
  return 1
}

# --- どのブランチでも触らせないもの ---
case "$REL" in
  .env|.env.*|*/.env|*/.env.*)
    block "PreToolUse:protect-paths" "BLOCKED: .env への書き込み。シークレットはエージェントが扱いません（CLAUDE.md §1）。"
    ;;
  CLAUDE.md|*/CLAUDE.md)
    block "PreToolUse:protect-paths" "BLOCKED: CLAUDE.md（憲法）の中身は PM の所有物です。
自律エージェントに憲法を書き換えさせません。変更提案は /flywheel で
docs/memory-bank/pending-<slug>.md に草案として隔離し、PM 承認を待ってください（CLAUDE.md §10）。"
    ;;
  docs/adr/*)
    block "PreToolUse:protect-paths" "BLOCKED: docs/adr/ は決定の正本。書き戻しは /flywheel の草案 → 人が確定します。"
    ;;
  *.sql|fixtures/real*|*/fixtures/real*)
    block "PreToolUse:protect-paths" "BLOCKED: 実データ / SQL ダンプ。dev は合成フィクスチャのみ（例外なし）。
（Prisma のマイグレーション SQL も手書きしない。生成と適用は統合役が prisma migrate で行う。）"
    ;;
  docs/画面仕様/*|docs/必要画面・機能一覧.md)
    block "PreToolUse:protect-paths" "BLOCKED: docs/画面仕様・必要画面・機能一覧 は answer key（仕様の正本。ADR-0005 の対応物）。
テストや実装を通すために仕様の側を書き換えることはできません。変更は PM の仕事です。"
    ;;
  apps/web/src/common/api/generated/*)
    block "PreToolUse:protect-paths" "BLOCKED: orval 生成物は手で編集しません（README 規約）。
契約を変えたいなら apps/service 側の contract（zod-openapi）を直し、make gen-api で再生成してください。"
    ;;
  apps/service/prisma/migrations/*)
    block "PreToolUse:protect-paths" "BLOCKED: マイグレーション SQL は手書き・手修正しません。
schema.prisma を直し、生成と適用は統合役が prisma migrate で行います（層境ゲート・CLAUDE.md §1-2）。"
    ;;
esac

# --- ブランチ層で分岐（判定は lib.sh の slice_branch_layer()・番号必須） ---
LAYER="$(slice_branch_layer "$BRANCH")"   # feature / spec / 空文字
case "${LAYER:-$BRANCH}" in
  spec)
    # 上流：実装は書けない（受け入れテスト＝is_acceptance 該当パスは除く）
    if ! is_acceptance "$REL"; then
      case "$REL" in
        apps/*)
          block "PreToolUse:protect-paths" "BLOCKED: spec/* ブランチから実装は書けません（CLAUDE.md §1-4）。
実装が仕様ブランチに紛れ込みます。$REL は feature/* で書いてください。
（spec/* で書けるのは受け入れテストのみ: apps/service の *.integration.test.ts、
 apps/web/src/__test__ の *.acceptance.test.tsx、e2e/、および docs/spec/）"
          ;;
      esac
    fi
    # 受け入れテストは「仕様表が承認済み」のときだけ書ける（ADR-0012 Phase ゲート）
    if is_acceptance "$REL"; then
        SLICE="$(printf '%s' "${BRANCH#spec/}" | grep -oE '^slice-[0-9]+')"
        [[ -z "$SLICE" ]] && SLICE="${BRANCH#spec/}"
        SPEC_FILE="$(ls "${PROJECT_DIR}/docs/spec/${SLICE}"*.md 2>/dev/null | head -1)"
        if [[ -z "$SPEC_FILE" || ! -f "$SPEC_FILE" ]]; then
          block "PreToolUse:protect-paths" "BLOCKED: 仕様表がありません: docs/spec/${SLICE}*.md
/spec ${SLICE} の Phase A（grill）を先に済ませてください（ADR-0012）。"
        fi
        if ! grep -qE '^approved:[[:space:]]*true[[:space:]]*$' "$SPEC_FILE"; then
          block "PreToolUse:protect-paths" "BLOCKED: 仕様表が未承認です（${SPEC_FILE#$PROJECT_DIR/}）。
Phase A の grill 結果を PM が確認し、frontmatter を approved: true に変えてから
/spec ${SLICE} を叩き直してください。承認は口頭でなく git に残します（ADR-0012）。"
        fi
        # ADR-0018: 画面要件が空欄のまま approved でも受け入れテストを書かせない。
        # 「スクリーンショット比較できない → UI 検証不要」の独断すり替えを構造で塞ぐ。
        # 画面なしの明記も要る。テンプレのプレースホルダ '<...>' が残っていたら未記入。
        if ! grep -qE '^##[[:space:]]+画面要件' "$SPEC_FILE"; then
          block "PreToolUse:protect-paths" "BLOCKED: 仕様表に画面要件セクションがありません（ADR-0018）: ${SPEC_FILE#$PROJECT_DIR/}
受け入れテストは API 層と UI 層の二層が必須です。画面を持たないスライスでも
「画面なし」＋理由を画面要件に明記してください（docs/spec/_template.md 参照）。"
        fi
        if grep -qE '対象画面:[[:space:]]*<' "$SPEC_FILE"; then
          block "PreToolUse:protect-paths" "BLOCKED: 仕様表の画面要件が未記入です（プレースホルダ '<...>' が残存）: ${SPEC_FILE#$PROJECT_DIR/}
「検証しづらい」を「検証しなくてよい」に読み替えないでください（ADR-0018）。
対象画面（docs/画面仕様 の該当ページ）と UI 受入テストの形（RTL の DOM アサーション / E2E）を埋め、
画面が無いなら「画面なし」＋理由を書いてから approved: true にしてください。
UI の受入基準が要るかは Phase A の grill で PM が決めます。"
        fi
    fi
    ;;

  feature)
    # 下流：仕様（受け入れテスト・仕様表）は read-only
    if is_acceptance "$REL"; then
      block "PreToolUse:protect-paths" "BLOCKED: 受け入れテストは読み取り専用です（ADR-0001・ADR-0004）。
受け入れテスト＝仕様。テストが赤いのはテストが悪いのではなく実装が足りないからです。
apps/service・apps/web の実装を直して緑にしてください。
（ユニットテストは書いてよい: *.integration.test.ts / *.acceptance.test.tsx 以外の *.test.ts(x)）
テスト自体に誤りがあると考える場合は、修正せずリーダーへ質問として出して停止すること。"
    fi
    case "$REL" in
      docs/spec/*)
        block "PreToolUse:protect-paths" "BLOCKED: docs/spec/ は仕様表（PM 所有）。feature/* から変更できません。"
        ;;
    esac
    ;;

  main|master)
    block "PreToolUse:protect-paths" "BLOCKED: main 上で編集しています。作業ブランチを切ってください（CLAUDE.md §1-1）。"
    ;;

  *)
    # 認識できないブランチ（detached HEAD・unborn・想定外）では、層で管理される
    # 書込対象を fail-closed でブロックする。ブランチ判定が空振りしたときに
    # ADR-0004 の書込制限が素通りする穴（fail-open）を塞ぐ。
    case "$REL" in
      apps/*|e2e/*|docs/spec/*)
        block "PreToolUse:protect-paths" "BLOCKED: 現在ブランチを特定できません（branch='${BRANCH}'）。
層で管理される書込対象（apps/ e2e/ docs/spec/）は、
作業ブランチ（feature/slice-NN / spec/slice-NN、NN=/board 採番）を切ってから編集してください（ADR-0004・CLAUDE.md §1-1）。"
        ;;
    esac
    ;;
esac

hook_log "PreToolUse:protect-paths" "allow" "[$BRANCH] $REL"
exit 0
