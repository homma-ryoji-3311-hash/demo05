# reference-mock の出所（PROVENANCE）

- **正体**: Repo Base（`staff-report-system`／通称 answer key）の設計・要件文書一式。
- **性質**: 文書ベース（実行可能な FastAPI モックではない）。現物に画面は無い（ADR-0018 が前提とする通り）。
- **取得元**: `staff-report-system-demo02/reference-mock/`（2026-07-15 取得）。
- **read-only**: 憲法 §1-3 / ADR-0005。`protect-paths.sh` が全ブランチで書込をブロックする。
  answer key を書き換えてテストを緑にする経路を塞ぐため。

| ファイル | 内容 |
|---|---|
| `spec.md` | 要件定義／設計仕様（全体像・8画面・データモデル・6フェーズ） |
| `phase1-plan.md` | Phase 1 タスク分解・最小データモデル・環境変数 |
| `phase2-design.md` | Phase 2 以降の権限3軸・報告サイクル・報告ステータス |
| `report-quality-design.md` | AI追加質問（報告品質向上）機能の設計方針 |

> **合成データのみ**（Step 0 項目1 のシード棚卸し済み）。実データ・PII・DBダンプは含まない。
> いずれも設計文書であり、フィクスチャ／シードデータを持たない。
