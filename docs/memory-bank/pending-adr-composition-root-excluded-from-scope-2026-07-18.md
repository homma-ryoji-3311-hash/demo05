# pending ADR 草案: 合成ルート・横断強制ファイルを §3 範囲判定から除外する — 2026-07-18

/flywheel 草案③。**既存 `pending-slice-scope-composition-root-2026-07-16.md`（slice-02 で草案化）の昇格**。
全スライスで再発したため、宣言（指示書テンプレ）＋ ADR 化を提案する。確定は人（docs/adr/ は protect-paths でブロック＝Harness-Keeper が人の手で確定）。

## 背景（再発の証拠）

- slice-02 で初出（`pending-slice-scope-composition-root-2026-07-16.md`）。
- slice-06 でも §3 が `app.ts`／`router.tsx`（合成ルート）と、§6 が「正本」と呼ぶ reports 所有権403 ファイルを落としていた。下流は毎回「範囲外だが正当」と判断させられ、完了定義③（§3 全ディレクトリに diff）と実態が食い違う。

## 決定案（ADR-00NN）

1. **合成ルート・配線ファイルは §3 の範囲判定の対象外**とする（常に触ってよい）:
   `apps/service/src/app.ts`・`apps/service/src/main.ts`・`apps/web/src/router.tsx`・vite/client 設定。
   これらに diff があっても「範囲外変更」に数えない。逆に**触らずに配線が要るのに緑**なら設計の穴。
2. **横断強制（認可・共通エラーハンドラ等）を担うスライスは、その正本ファイルを §3 に明示的に含める**。
   `/brief` が §3 を生成する際、§6 で「正本は本スライス」と書くならその実装ファイルを §3 にも列挙する
   （§3 と §6 の齟齬を禁止）。
3. 完了定義③の突合は、上記の合成ルート除外を前提に行う。

## 強制力の階段（1段）

- 現在: pending 宣言のみ（効いていない・再発）。
- 今回（chore/flywheel-2026-07-18b）: **指示書テンプレ `docs/slices/_template.md` §3 に固定行を追記**（宣言化）。
- 次段（人が確定）: ADR-00NN として `docs/adr/` に決定を固定 ＋ `/brief` の §3 生成ロジックに反映。

## 剪定

CLAUDE.md 本体は不変更（146行）。ADR とテンプレで解く。
