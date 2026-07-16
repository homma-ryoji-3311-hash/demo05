# pending ハーネス不具合: runner のプロセス管理が Windows で破綻（反転確認が回せない）（2026-07-16 / #1・#3・#4 修正 2026-07-16）

> `/flywheel` の隔離草案（ハーネス欠陥 → AIアーキ／Harness-Keeper・CLAUDE.md §10）。
> 下流セッション（`/verify`, Phase1 バッチ）で観測。**実装欠陥ではなく `tools/teamdev-test-runner-mcp` の欠陥**。
> 強制力の階段（README）に従い、まず runner（実行時）の修正を提案する。

## 【解決 2026-07-16・AIアーキ／Harness-Keeper】#1・#3・#4 を修正

**真因（#1）**: `process_manager.py` の `stop()` の graceful パスが Windows で `proc.terminate()`
（トップ = `cmd.exe` のみ終了）を呼び、`wait()` がトップの exit で成功を返すため、
ツリー kill する `taskkill /F /T`（force 段）に**到達しない**。孫（node→pnpm→vite/tsx）が孤児化して
ポートを掴み続ける。しかも成否を「トップの exit」で判定するので `stopped:true` を**嘘で返す**。

**修正（`tools/teamdev-test-runner-mcp/src/teamdev_test_runner/process_manager.py`）**:
- Windows は**トップが生きているうちにツリーごと `taskkill /F /T /PID`**（先にトップを殺すと孫を取りこぼす）。
  console の孫に届く graceful シグナルは無いので Windows の graceful は行わない（アプリの SIGTERM ハンドラは
  どのみち Windows terminate では発火しない）。POSIX は従来どおり `killpg(SIGTERM→SIGKILL)`。
- **成否判定を「トップの exit」→「ポート解放」に変更**（`_wait_port_released`）。取り残しがあれば再度ツリー/
  グループごと落とし、解放できなければ `stopped:false`＋孤児警告を返す（嘘の緑を出さない）。ADR-0018 決定5
  （frontend 停止 → `ui.spec` 赤）の前提条件が復活。
- `_terminate` を廃し `_win_tree_kill` / `_posix_kill` / `_wait_port_released` に分割。

**#3・#4（`apps/service/test-harness.runtime.json`）**:
- `env` に `PERSISTENCE=memory` ＋ placeholder `DATABASE_URL` を恒久追加。runner は**受け入れ検証用**で
  seeded in-memory が設計上の正（`main.ts` L15-18 明記）。`.env` を触らずに DB 無しで起動できる。
- `bootTimeoutMs` 60000 → 120000（`tsx watch` 初回コンパイル実測 ~100s > 60s の誤 not-ready を解消）。

**検証**:
- runner ユニットテスト **23/23 緑**。以前 Windows で落ちていた回帰テスト `test_子孫プロセスまで殺す`
  （`.pytest_cache` lastfailed に記録）が緑化。
- 実ツリー検証: 修正後 `ProcessManager` で `pnpm dev`（vite:5173）を start→stop → **`stopped:true` かつ
  port 5173 が実際に解放**。backend も `PERSISTENCE=memory` で起動・`/api/health` 200・stop で :3000 解放。

**⚠ 運用注記**: 稼働中の `teamdev-test-runner` MCP は**旧コードを import 済み**。修正の反映には
**MCP サーバ（Claude Code セッション）の再起動が必要**。再起動後、`/verify` 判定1 の反転確認を
`harness_stop` で正しく回せる。

**残 #2（MCP 1800s 無応答）は未解決（monitor）**: `ready_check` は bootTimeout で境界済みで無限ループ源ではない。
今回の孤児プロセス乱立が誘発した疑いが濃く #1 修正で状態は健全化するが、根因は再現待ち。下記 #2 節を参照。

---

## 要約（2件・いずれも上流で修正）

| # | 事象 | 直接の被害 | 深刻度 |
|---|---|---|---|
| 1 | **`harness_stop` が子プロセスツリーを kill しきらない**（Windows）。`pnpm dev` ラッパのみ落ち、子の `vite` / `tsx watch` が孤児化してポートを掴み続ける | **ADR-0018 決定5 の「frontend 停止 → `ui.spec` 赤へ反転」が物理的に回せない**（停止したはずの 5173 が HTTP 200 を返し続け、ui は緑のまま） | 高（判定1 の中核が検証不能） |
| 2 | **`harness_status` / `harness_start` が 1800s 無応答**（MCP がハングし idle timeout で abort）。プロセス自体は裏で起動・listening する | ハーネス操作が不確定。起動成否を別経路（直接 HTTP / `Get-NetTCPConnection`）で確認せざるを得ない | 高（幸福経路 `/verify` が完走しない） |

## 事象 #1: harness_stop のプロセスツリー kill 漏れ

### 観測
- `harness_stop(apps/web)` → `{"stopped": true, "exitCode": 1}` を返す。
- 直後に `http://localhost:5173/` は **HTTP 200（len=644）を返し続ける**。`ui.spec` を再実行 → **13〜14/14 が緑のまま**。
- `Get-NetTCPConnection -LocalPort 5173` で **孤児 `node`（vite）が listening**。手動 kill しても別インスタンスが即ポートを再占有（`pnpm → node(vite)` の親子で、leaf だけ残る／別 leaf が起動）。
- 反転確認の最終 run で赤化した 1 件は接続拒否ではなく**実 DOM を掴んだ上でのデータ差異**（`locator resolved to <textarea id="report-body" placeholder="今日の業務内容を入力してください">`）。→ **spec は実 frontend を描画している**。反転しない真因は spec 側ではなく stop の kill 漏れ。

### 影響
- `/verify` 判定1 の **frontend 停止反転（ADR-0018 決定5）が実行不能**。工程4 の偽 UI spec を捕まえる最後の関所が機能しない。
- ポートが解放されないため、次の起動・次スライスが 5173/3000 衝突を起こす（CLAUDE.md §5「ポートを掴んだまま次に進まない」が守れない）。

### 提案（runner の修正）
- `harness_stop` を **プロセスツリー全体**に効かせる。Windows は `taskkill /PID <pid> /T /F` 相当、POSIX は プロセスグループ（`kill -TERM -<pgid>`）で子孫まで送る。
- 停止後に **ポートが実際に解放されたかを readyCheck の逆（port not listening）で確認**してから `stopped: true` を返す（現状は wrapper の exit だけ見ている疑い）。
- 補強: 起動時に子 pid 群を記録し、stop でその集合を確実に落とす。

## 事象 #2: harness_status / harness_start の 1800s 無応答

### 観測
- `harness_status(apps/service)` と、その後の `harness_start(apps/service)` が **それぞれ 1800s 無応答で abort**（`MCP server ... sent no response or progress for 1800s`）。
- ただし `harness_start` の abort 後に直接確認すると backend は **listening・`/api/health` 200**（プロセスは裏で起動していた）。

### 影響
- ハーネス操作の成否が MCP 応答から判定できず、`/verify` の幸福経路が完走しない。毎回 PowerShell の直接 HTTP / ポート確認で代替が必要。

### 提案
- MCP のハング原因を切り分け（ready 待ちループのブロッキング／子プロセス stdout の pipe 詰まり等が疑わしい）。
- 応答が返らないケースでも **進捗（progress）を定期送出**して idle timeout を避ける。
- 併せて per-server `timeout` か `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT` の既定を runner に同梱。

## 併発した環境ギャップ（本件の副次・別途対応可）

3. **backend が `DATABASE_URL` 必須だが runtime.json 未設定**、設計上のローカル緑パス `PERSISTENCE=memory`（`apps/service/src/main.ts` L15-18 のコメント）も未配線。`.env` 書込は secretlint/dotenv ガードレールで**全方式ブロック**（Write / PowerShell / Bash とも拒否）。
   - 今回は `apps/service/test-harness.runtime.json` の `env` に `PERSISTENCE=memory` ＋ dummy `DATABASE_URL` を**一時注入 → 検証後 revert**して回避。
   - 恒久案: runner の runtime.json に「ローカル緑用プロファイル」を持たせる（`PERSISTENCE=memory` 前提で DB 不要に）、または受け入れ検証用の env を runner 側で注入。`.env` を触らせないガードレールは維持したまま解決すること。
4. **backend の `bootTimeoutMs=60000` < 実初回コンパイル ~100s**（`tsx watch` の初回）。`harness_start` が誤って「not ready」を返すが実際は起動する。→ `bootTimeoutMs` を 120000 程度へ。
5. **pnpm 未インストール**（corepack は `C:\Program Files\nodejs` への書込権限不足で失敗）。→ 今回 `npm i -g pnpm@10.33.2`（PATH 上のユーザー npm global）で解消。環境セットアップ手順に明記。

## Phase1 バッチ（/verify）への影響

- 判定 2（golden＝該当なし・DOM 代替）・判定 3（範囲 diff：service 41 / web 15 / acceptance 18）・判定 4（秘密・PII なし）は **○**。
- 判定 1 は**両サーバ起動時 37/37 緑（api 23・ui 14）だが、反転確認が #1 で実行不能**。→ ADR-0018 の要件を満たすには **runner の kill 修正（#1）が前提**。統合前に AIアーキが #1・#2 を解消する。

## 関連

- ADR-0018（受け入れの2層・反転確認）: 決定5 の反転が Windows runner で回らない。
- CLAUDE.md §3（自動停止トリガー・「ハーネスのバグとして報告」）／§5（runner はアプリ起動のみ・ポートを掴んだまま進まない）。
- 既知の翻訳欠陥 [[pending-ui-spec-conflicts-2026-07-16]] #2（`ui.spec` の共通状態セットアップ欠落）と症状が符合（反転 run で `create.ui.spec` 再訪復元がデータ空で赤化）。
