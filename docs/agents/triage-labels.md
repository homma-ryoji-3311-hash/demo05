# Triage Labels

mattpocock/skills が使う5つのトリアージロールと、このリポの実ラベルの対応表。

| Label in mattpocock/skills | このリポのラベル | 意味 |
| -------------------------- | ---------------- | ---- |
| `needs-triage`             | `needs-triage`   | メンテナの評価待ち |
| `needs-info`               | `needs-info`     | 報告者からの追加情報待ち |
| `ready-for-agent`          | `ready-for-agent`| 完全に仕様化済み・AFK エージェントが着手可 |
| `ready-for-human`          | `ready-for-human`| 人間の実装が必要 |
| `wontfix`                  | `wontfix`        | 対応しない |

スキルがロール名で言及したら（例:「AFK-ready ラベルを付けろ」）、この表の右列の文字列を使う。

## staff-report 固有ラベル（既存・別系統）

`irreversible`（migration・認可・`acceptance/` に触る PR、ADR-0007）は**トリアージロールではない**。ゲートの重み付け用なので、この表にマップしない。
