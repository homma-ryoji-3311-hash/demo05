# pending ADR 草案: 実行可能な reference-mock を authored artifact として持つ（2026-07-15）

> `/flywheel` の隔離草案。**PM が方針を承認済み（2026-07-15）**。ADR-0005/0018 への正式な書き戻し（docs/adr/ の確定）は人が行う（自律エージェントに ADR を書かせない・CLAUDE.md §10）。
> 本ファイルは承認済み方針の根拠記録であり、docs/adr/ 確定までの隔離置き場。

## 背景（観測された事実）

- vendor した `reference-mock/` は**文書ベース**（`spec.md` 等）で、**起動できるサーバではない**。
- そのため工程4 Phase B の核「参照モックに対してスイートが緑」が物理的に実行できない（ADR-0018 が既に名指し）。
- PM 判断（2026-07-15）で「**実行可能な reference-mock を作る**」と決定（工程4 を本来の緑→赤反転で回すため）。
- `reference-mock/*` は `protect-paths.sh` が全ブランチで書込ブロック（ADR-0005。answer key を書き換えて緑にする経路を塞ぐ）。この保護は維持する——vendor 文書は read-only のまま触らない。

## 提案（PM 承認済み）

1. 実行可能な reference-mock は `reference-mock/`（read-only の vendor 文書）とは別の authored artifact とし、**保護外**（`tools/reference-mock-server/`）に置く。vendor 文書には一切触れない（ADR-0005 の保護意図＝「answer key を書き換えて緑にしない」は保たれる）。
2. `acceptance/` は `ACCEPTANCE_BASE_URL` でこのサーバに接続する（ADR-0005 の base-url 方針は維持）。
3. **循環参照の緩和**: このモックは我々が同じ設計文書から実装するため、独立したオラクルより弱い。`source: reference-mock` の AC は「テストが実行可能で内部整合」までを証明し、`source: PM`（設計）の妥当性は引き続き PM の重量ゲートが担保する。

## 影響する ADR

- **ADR-0005**（reference-mock を vendor・read-only）: 「文書ベース read-only」を「文書＝read-only ＋ 実行オラクルは保護外に authored」へ改訂。
- **ADR-0018**（reference-mock は文書ベースで画面なし）: API 層は実行オラクルで緑にできるようになる。UI 層は依然 answer key を持たず PM レビュー（変更なし）。

## 未決（PM が詰める）

- モックの実装範囲をどこまで広げるか（slice ごとに足すか、Phase 単位でまとめるか）。
- モックのドリフト防止（仕様表と挙動がずれない担保）。
- スタック（現状 Node 組み込み http・依存ゼロ。将来 Express 等に寄せるか）。
