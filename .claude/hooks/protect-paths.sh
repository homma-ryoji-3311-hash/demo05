#!/usr/bin/env bash
# PreToolUse(Edit|Write|NotebookEdit): 書込権を「ブランチ名」で判定する（ADR-0004）。
#
#   spec/slice-NN   … acceptance/ と docs/spec/ を書ける。実装は書けない。
#                     ただし docs/spec/slice-NN.md に approved: true が無ければ
#                     acceptance/ への書込はブロック（ADR-0012 の Phase ゲート）。
#   feature/slice-NN… 実装を書ける。acceptance/ は read-only。
#
# 「人の役職」で判定しない。役職ベースだと、AIアーキが下流セッションを回した瞬間に穴が開く。
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PAYLOAD="$(cat)"
FILE="$(json_field "$PAYLOAD" "d.get('tool_input',{}).get('file_path') or d.get('tool_input',{}).get('notebook_path')")"
[[ -z "$FILE" ]] && FILE="$PAYLOAD"
REL="${FILE#$PROJECT_DIR/}"

BRANCH="$(current_branch)"   # unborn/detached 安全（lib.sh）。空文字は下の *) で fail-closed

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
    block "PreToolUse:protect-paths" "BLOCKED: 実データ / SQL ダンプ。dev は合成フィクスチャのみ（例外なし）。"
    ;;
  reference-mock/*)
    block "PreToolUse:protect-paths" "BLOCKED: reference-mock/ は answer key（ADR-0005）。
テストを緑にするために正解の側を書き換えることはできません。"
    ;;
esac

# --- ブランチ層で分岐（判定は lib.sh の slice_branch_layer()・番号必須） ---
LAYER="$(slice_branch_layer "$BRANCH")"   # feature / spec / 空文字
case "${LAYER:-$BRANCH}" in
  spec)
    # 上流：実装は書けない
    case "$REL" in
      apps/service/*|apps/web/*)
        block "PreToolUse:protect-paths" "BLOCKED: spec/* ブランチから実装は書けません（CLAUDE.md §1-4）。
実装が仕様ブランチに紛れ込みます。$REL は feature/* で書いてください。"
        ;;
    esac
    # acceptance/ は「仕様表が承認済み」のときだけ書ける（ADR-0012 Phase ゲート）
    case "$REL" in
      acceptance/*)
        SLICE="${BRANCH#spec/}"                    # spec/slice-01 → slice-01
        SPEC_FILE="${PROJECT_DIR}/docs/spec/${SLICE}.md"
        if [[ ! -f "$SPEC_FILE" ]]; then
          block "PreToolUse:protect-paths" "BLOCKED: 仕様表がありません: docs/spec/${SLICE}.md
/spec ${SLICE} の Phase A（grill）を先に済ませてください（ADR-0012）。"
        fi
        if ! grep -qE '^approved:[[:space:]]*true[[:space:]]*$' "$SPEC_FILE"; then
          block "PreToolUse:protect-paths" "BLOCKED: 仕様表が未承認です（docs/spec/${SLICE}.md）。
Phase A の grill 結果を PM が確認し、frontmatter を approved: true に変えてから
/spec ${SLICE} を叩き直してください。承認は口頭でなく git に残します（ADR-0012）。"
        fi
        # ADR-0018: 画面要件が空欄のまま approved でも acceptance/ を書かせない。
        # 「pixel 比較できない → UI 検証不要」の独断すり替え（インシデント #2）を構造で塞ぐ。
        # 画面なしの明記も要る。テンプレのプレースホルダ '<...>' が残っていたら未記入。
        if ! grep -qE '^##[[:space:]]+画面要件' "$SPEC_FILE"; then
          block "PreToolUse:protect-paths" "BLOCKED: 仕様表に画面要件セクションがありません（ADR-0018）: docs/spec/${SLICE}.md
受け入れテストは API 層と UI 層の二層が必須です。画面を持たないスライスでも
「画面なし」＋理由を画面要件に明記してください（docs/spec/_template.md 参照）。"
        fi
        if grep -qE '対象画面:[[:space:]]*<' "$SPEC_FILE"; then
          block "PreToolUse:protect-paths" "BLOCKED: 仕様表の画面要件が未記入です（プレースホルダ '<...>' が残存）: docs/spec/${SLICE}.md
「撮れない」を「検証しなくてよい」に読み替えないでください（ADR-0018）。
対象画面と golden 撮影の可否（可/不可）を埋め、画面が無いなら「画面なし」＋理由を書いてから
approved: true にしてください。UI の受入基準が要るかは Phase A の grill で PM が決めます。"
        fi
        ;;
    esac
    ;;

  feature)
    # 下流：仕様は read-only
    case "$REL" in
      acceptance/*)
        block "PreToolUse:protect-paths" "BLOCKED: acceptance/ は読み取り専用です（ADR-0001・ADR-0004）。
受け入れテスト＝仕様。テストが赤いのはテストが悪いのではなく実装が足りないからです。
apps/service/ apps/web/ を直して緑にしてください。
テスト自体に誤りがあると考える場合は、修正せずリーダーへ質問として出して停止すること。"
        ;;
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
      apps/service/*|apps/web/*|acceptance/*|docs/spec/*)
        block "PreToolUse:protect-paths" "BLOCKED: 現在ブランチを特定できません（branch='${BRANCH}'）。
層で管理される書込対象（apps/service/ apps/web/ acceptance/ docs/spec/）は、
作業ブランチ（feature/slice-NN / spec/slice-NN、NN=/board 採番）を切ってから編集してください（ADR-0004・CLAUDE.md §1-1）。"
        ;;
    esac
    ;;
esac

hook_log "PreToolUse:protect-paths" "allow" "[$BRANCH] $REL"
exit 0
