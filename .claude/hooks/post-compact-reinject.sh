#!/usr/bin/env bash
# PostCompact: compaction で消えた禁止事項を再注入する。
# 「compaction による指示忘れ」はコンテキスト汚染の代表的な失敗パターン（計画書 §6・R-5）。
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cat >/dev/null   # payload は使わないが読み捨てる

hook_log "PostCompact" "reinject" "禁止事項を再注入"

additional_context "PostCompact" "【compaction 後の再注入：staff-report の禁止事項（CLAUDE.md §1）】
1. commit / push / DBマイグレーション（prisma migrate・db:migrate/deploy）を実行しない。実行者は統合役ただ1人。
2. 受け入れテストを変更しない。apps/service の *.integration.test.ts と
   apps/web/src/__test__ の *.acceptance.test.tsx（と e2e/）＝仕様＝読み取り専用（ADR-0001）。
3. スライス指示書「3. 触ってよいファイル範囲」の外を変更しない。
4. main 上で作業しない。作業は feature/slice-NN（実装）/ spec/slice-NN（仕様）のみ。
5. docs/画面仕様・docs/必要画面・機能一覧.md（answer key）と orval 生成物
   （apps/web/src/common/api/generated/）を書き換えない。
6. 実データを持ち込まない。dev は合成フィクスチャのみ。
7. シークレット・PII を出力や差分に混入させない。
8. 緑になったら停止して報告する。次に進まない。緑 ≠ 仕様充足。

自動停止トリガー: 同一エラー2回 / 5ファイル・Edit5回 / 同じテスト3回リトライ → 停止して報告。

なお、コンテキストが膨れている状態です。このまま続けるより、
セッションを捨てて /pickup <issue> から再開したほうが枠効率は良い（CLAUDE.md §4）。"
