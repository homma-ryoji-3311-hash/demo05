---
name: spec
description: 仕様表を PM との grill で作り（Phase A）、承認後に acceptance/ の受け入れテストと golden へ翻訳する（Phase B）。参照モックで緑・backend で赤を確認して PR を出す。spec/* ブランチ専用。叩くのは PM。Use when the PM runs /spec with a slice id.
disable-model-invocation: true
---

# /spec <slice>

## 禁止事項（最初に読む）

- **`feature/*` ブランチで叩かれたら即停止。** `acceptance/` を実装ブランチから触らせない（ADR-0004）。
- **Phase A の承認なしに Phase B へ進まない。** hook がブロックする。回避策を探さない。
- **grill の答えを AI が自分で埋めない。** 質問して、PM の返答を待つ。
- 実装（`apps/service/` `apps/web/`）を書かない。ここは仕様ブランチ。
- main へ push しない。マージは統合役。

---

## Phase A：仕様表（`docs/spec/slice-NN.md` が無い、または `--regrill`）

**性質：判断業務。** 手順ではなくヒューリスティクス。PM に質問しながら進める。

1. `docs/design/overview.md` と `docs/slices/README.md` から**このスライスの範囲**を読む。
2. `reference-mock/` の該当箇所を読み、Given/When/Then の**下書き**を作る（read-only）。
3. `grill-with-docs` で **PM に質問する**。少なくとも次を潰す：
   - 受入基準はこれで過不足ないか（**≤3〜5**。超えたらスライス分割を提案する）
   - このステータスコードは**仕様か、モックの実装都合か**（例: 422 は仕様。500 は実装都合）
   - 合成フィクスチャの各フィールドは **L0 / L1 / L2** のどれか
   - `CONTEXT.md` の用語とズレていないか（ズレたら用語を先に直す）
   - **参照モックに無い挙動**が要るか（＝ここだけが本当の設計）
   - **確定同期系（確定に相乗りする内部処理）の観測経路は grill しない**（ADR-0019）。観測は
     `POST /reports/:id/confirm` の**レスポンスにトップレベルキーを1つ足す**方式で既定化済み
     （slice-11=`projects/incidents`・slice-12=`master_summaries`）。pin するのは**足すキーの形**
     （キー名・値の shape）だけ。専用 GET・別 feature 経由の観測にしない。非同期化する場合のみ
     仕様表に `source: PM` で例外明記する。
   - **画面要件**（ADR-0018）：このスライスに画面はあるか。**あるなら UI の受入基準を AC-n として立てる**
     （API の AC だけで 3〜5個 を埋めない）。**参照モックに画面が無いなら UI の AC は `source: PM`** ＝本当の設計。
     golden 撮影は可か不可か。**画面設計そのものが `docs/design/overview.md` に無いなら、ここで埋めず工程1 へ戻す**（設計凍結ゲートの漏れ・ADR-0016）。

   > **PM が「未定」と答えたら、AI が埋めない。** 未定を残したまま `approved: true` にはしない。
   > **画面要件（`docs/spec/_template.md` の該当節）を空欄のまま `approved: true` にしない**（ADR-0018）。「画面なし」も明記が要る。
4. `docs/spec/_template.md` を雛形に `docs/spec/slice-NN.md` を書く。**各受入基準に `source:` を必ず付ける。**

```markdown
---
slice: slice-01-report-create
approved: false        # ← PM が true にするまで Phase B に進めない
---

## AC-1 報告を1件保存できる
- source: reference-mock
- Given 空でない報告本文
- When  POST /api/reports に送る
- Then  201 と作成された report id が返る

## AC-2 空の本文を拒否する
- source: reference-mock
- Given 空の報告本文（""）
- When  POST /api/reports に送る
- Then  422 が返る

## 合成フィクスチャ
| フィールド | 階層 | 例 |
|---|---|---|
| body | L0 | "本日の報告" |
```

5. **停止して PM に提示する。**「`approved: true` に変えてから `/spec <slice>` を叩き直してください」と伝える。

> **`source: reference-mock` ばかりなら健全。`source: PM` の項目こそ重点レビュー対象**——それが唯一の「新しく決めたこと」だから。

---

## Phase B：翻訳（`approved: true` を確認してから）

**性質：壊れやすい操作。順序固定。フラグ追加禁止。**

1. `spec/slice-NN` ブランチを切る（無ければ）。
2. 仕様表を読む。`approved: true` でなければ**停止**。**画面要件が空欄でも停止**して Phase A へ返す（ADR-0018）。「画面なし」の明記も無いなら未完成。
3. AI が `acceptance/` へ**二層で**翻訳する（ADR-0018）。最新 API は Context7 に聞く。思い出しで書かない。
   接続先は**2本**を `process.env` から取る：`ACCEPTANCE_BASE_URL`（API）と `ACCEPTANCE_UI_BASE_URL`（画面）。

   | ファイル | フィクスチャ | 検証するもの |
   |---|---|---|
   | `acceptance/<feature>/<name>.api.spec.ts` | `request` | HTTP の契約（ステータス・ボディ・エラー） |
   | `acceptance/<feature>/<name>.ui.spec.ts` | `page` | ユーザーに見える振る舞い（**`page.goto()` 必須**） |

   **UI spec が 0 本のスライスは Phase B を完了できない。** 画面を持たないスライスは、仕様表の画面要件に「画面なし」＋理由が明記された場合にかぎり免除（＝ `approved: true` に含まれる）。**「pixel 比較できない」を「UI 検証不要」に読み替えない**（撮れないなら role/label ベースの DOM アサーションへ縮退する・ADR-0018）。
4. **参照モックで `api.spec.ts` の緑を確認する。** ← API 翻訳が正しい証明
   `harness_start(app_dir="reference-mock")` → ready → **両方の変数を :8000 へ向けて**テスト実行。
   - `api.spec.ts` が**緑**であること。**赤なら翻訳のバグ。実装のせいにしない。停止して報告する。**
   - `ui.spec.ts` は**赤のままが正常**（参照モックに画面が無く、緑にする手段が上流に無い）。
   - **`ui.spec.ts` が緑になってしまったら停止して PM へ報告**（参照モックに画面があった＝ADR-0008 の前提が生きている＝golden を撮れる可能性）。
4b. **静的検知（実行ではなく grep）：** 画面ありスライスに `*.ui.spec.ts` が存在し `page.goto(` を含むか。
   API-only で書くとここで 0 本になる。**UI 翻訳に効く唯一の機械判定**（frontend 不在でも判定できる）。
5. **golden スクショを撮る**（撮影可のスライスのみ）。参照モックの画面を `acceptance/golden/` へ。**実装より先に撮る**（後で撮ると実装が仕様を定義する）。撮影不可なら撮らない（DOM アサーションで代替済みのはず）。
6. **backend で `api.spec.ts` の赤を確認する。** ← 下流に渡せる証明
   `harness_start(app_dir="backend")` → `ACCEPTANCE_BASE_URL=http://localhost:3000` でテスト実行。
   **`api.spec.ts` が緑になったら停止。** 実装済みか、テストが何も検証していないかのどちらか。
7. `harness_stop` してから PR を作る（GitHub MCP）。`acceptance/` に触るので**常に重量ゲート**。

> **UI spec の「正しさ」は工程4 では証明できない。** 参照モックに画面が無い以上、反転（緑→赤）は API 層にしか効かない。存在すること・画面を叩いていること（4b）までしか機械で言えず、内容の正しさは **PM の重量ゲート**が読む。実行時の反転確認（frontend 停止）は frontend が実在する工程6 `/verify` で行う（ADR-0018・決定5）。

## 報告フォーマット（証拠ベース）

```
## Phase: A / B
## 受入基準: <n>個（source: PM <n>件 / reference-mock <n>件）
## 二層: api.spec.ts <n>本 / ui.spec.ts <n>本（画面なしなら「画面なし」＋理由）

## 参照モックでの結果（Phase B・両変数を :8000 へ）
$ ACCEPTANCE_BASE_URL=http://localhost:8000 ACCEPTANCE_UI_BASE_URL=http://localhost:8000 npx playwright test ...
<生出力>  → api.spec.ts は緑 / ui.spec.ts は赤のまま（正常）

## 4b 静的検知
- ui.spec.ts 存在: [○/✗]  page.goto( 含む: [○/✗]

## backend での結果（Phase B）
$ ACCEPTANCE_BASE_URL=http://localhost:3000 npx playwright test <api.spec.ts>
<生出力>  → api.spec.ts が赤であること

## golden
- acceptance/golden/<name>.png（撮影可のみ / 撮影不可: 理由）

## 次のアクション
PM: 重量ゲートで diff を読む → 統合役がマージ → /brief <slice>
```

次は `/brief <slice>`。
