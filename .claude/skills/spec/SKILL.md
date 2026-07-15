---
name: spec
description: 仕様表を PM との grill で作り（Phase A）、承認後に受け入れテスト（API=integration / UI=acceptance）へ翻訳する（Phase B）。テストが実装不在で赤であることを確認して PR を出す。spec/* ブランチ専用。叩くのは PM／AIアーキ。Use when the PM runs /spec with a slice id.
disable-model-invocation: true
---

# /spec <slice>

## 禁止事項（最初に読む）

- **`feature/*` ブランチで叩かれたら即停止。** 受け入れテストを実装ブランチから触らせない（ADR-0004）。
- **Phase A の承認なしに Phase B へ進まない。** hook がブロックする。回避策を探さない。
- **grill の答えを AI が自分で埋めない。** 質問して、PM の返答を待つ。
- 実装（`apps/service` `apps/web` の受け入れテスト以外）を書かない。ここは仕様ブランチ。
- **answer key（`docs/画面仕様/`・`docs/必要画面・機能一覧.md`）を書き換えない。**
- main へ push しない。マージは統合役。

---

## Phase A：仕様表（`docs/spec/slice-NN.md` が無い、または `--regrill`）

**性質：判断業務。** 手順ではなくヒューリスティクス。PM に質問しながら進める。

1. `docs/design/overview.md`（あれば）と `docs/slices/README.md` から**このスライスの範囲**を読む。
2. answer key（`docs/必要画面・機能一覧.md`・`docs/画面仕様/` の該当ページと design-example 画像）を読み、
   Given/When/Then の**下書き**を作る（read-only）。
3. `grill-with-docs` で **PM に質問する**。少なくとも次を潰す：
   - 受入基準はこれで過不足ないか（**≤3〜5**。超えたらスライス分割を提案する）
   - このステータスコードは**仕様か、実装都合か**（この repo の正: リクエスト検証失敗は **400**、
     ドメインエラーは `ErrorKind`→`KIND_TO_STATUS`。新しい kind が要るならそれ自体が設計事項）
   - 合成フィクスチャの各フィールドは **L0 / L1 / L2** のどれか
   - `CONTEXT.md` の用語とズレていないか（ズレたら用語を先に直す）
   - **画面仕様に書かれていない挙動**が要るか（＝ここだけが本当の設計）
   - **画面要件**（ADR-0018）：このスライスに画面はあるか。**あるなら UI の受入基準を AC-n として立てる**
     （API の AC だけで 3〜5個 を埋めない）。**画面仕様に無い UI 挙動は `source: PM`** ＝本当の設計。
     UI 検証の形（RTL の DOM アサーション / 将来の E2E）も決める。**画面設計そのものが
     `docs/画面仕様/` に無いなら、ここで埋めず工程1 へ戻す**（設計凍結ゲートの漏れ・ADR-0016）。

   > **PM が「未定」と答えたら、AI が埋めない。** 未定を残したまま `approved: true` にはしない。
   > **画面要件（`docs/spec/_template.md` の該当節）を空欄のまま `approved: true` にしない**（ADR-0018）。「画面なし」も明記が要る。
4. `docs/spec/_template.md` を雛形に `docs/spec/slice-NN.md` を書く。**各受入基準に `source:` を必ず付ける。**

```markdown
---
slice: slice-01-report-create
approved: false        # ← PM が true にするまで Phase B に進めない
---

## AC-1 報告を1件保存できる
- source: 画面仕様
- Given 空でない報告本文
- When  POST /api/reports に送る
- Then  201 と作成された report id が返る

## AC-2 空の本文を拒否する
- source: 画面仕様
- Given 空の報告本文（""）
- When  POST /api/reports に送る
- Then  400 が返る（ZodError → error-handler の規約）

## 合成フィクスチャ
| フィールド | 階層 | 例 |
|---|---|---|
| body | L0 | "本日の報告" |
```

5. **停止して PM に提示する。**「`approved: true` に変えてから `/spec <slice>` を叩き直してください」と伝える。

> **`source: 画面仕様` ばかりなら健全。`source: PM` の項目こそ重点レビュー対象**——それが唯一の「新しく決めたこと」だから。

---

## Phase B：翻訳（`approved: true` を確認してから）

**性質：壊れやすい操作。順序固定。フラグ追加禁止。**

1. `spec/slice-NN` ブランチを切る（無ければ）。
2. 仕様表を読む。`approved: true` でなければ**停止**。**画面要件が空欄でも停止**して Phase A へ返す（ADR-0018）。「画面なし」の明記も無いなら未完成。
3. AI が受け入れテストへ**二層で**翻訳する（ADR-0018）。最新 API は Context7 に聞く。思い出しで書かない。

   | 層 | ファイル | 検証するもの |
   |---|---|---|
   | API | `apps/service/src/__tests__/integration/<feature>/<name>.integration.test.ts` | HTTP の契約（supertest で `app.ts` を実 HTTP として叩く。ステータス・ボディ・エラー）。モック禁止・InMemory 実装を注入 |
   | UI | `apps/web/src/__test__/<feature>/<name>.acceptance.test.tsx` | ユーザーに見える振る舞い（**実装コンポーネントを import して render 必須**。RTL + MSW。MSW ハンドラは OpenAPI 契約に一致させる） |

   **UI テストが 0 本のスライスは Phase B を完了できない。** 画面を持たないスライスは、仕様表の画面要件に「画面なし」＋理由が明記された場合にかぎり免除（＝ `approved: true` に含まれる）。**「スクリーンショット比較できない」を「UI 検証不要」に読み替えない**（role/label ベースの DOM アサーションへ縮退する・ADR-0018）。
4. **テストが「翻訳として正しい」ことを静的に確認する。** この repo には参照モック（実行できる answer key）が
   無いので、M-team の「モックで緑」に相当する実行時証明は使えない。代わりに：
   - 各 AC が最低1つのテストケースに対応しているか（AC-n をテスト名に含める）。
   - API テストが `app.ts` 経由の実 HTTP（supertest）か。use-case 直呼びになっていないか。
   - UI テストが実装コンポーネントを import して render し、`getByRole`/`getByLabel` 等で検証しているか（grep での静的検知）。
   - 検証しているステータス・文言が仕様表と一致するか（400/404/409 の取り違えに注意）。
5. **実装不在で赤を確認する。** ← 下流に渡せる証明

   ```sh
   pnpm --filter @staff-report/api test -- <当該 integration テスト>
   pnpm --filter @staff-report/web test -- <当該 acceptance テスト>
   ```

   **緑になったら停止。** 実装済みか、テストが何も検証していないかのどちらか。PM へ報告する。
   （コンパイルエラーでの赤は「赤」に数えない。存在しない import はスタブ IF の追加が要るか、
   スライス設計の見直し事由——リーダーへ報告する。）
6. PR を作る（GitHub MCP）。受け入れテストに触るので**常に重量ゲート**。
   PR タイトル規約: `<type>(<scope>): <日本語要約> [SRP-<番号>]`（例: `test(service): slice-01 受け入れテストを追加 [SRP-10]`）。

> **UI テストの「正しさ」は工程4 では実行で証明できない**（実装がまだ無い）。存在すること・実装を
> render しようとしていること（静的検知）までしか機械で言えず、内容の正しさは **PM の重量ゲート**が読む。
> 実行時の反転確認は実装が実在する工程6 `/verify` で行う（ADR-0018・決定5）。

## 報告フォーマット（証拠ベース）

```
## Phase: A / B
## 受入基準: <n>個（source: PM <n>件 / 画面仕様 <n>件）
## 二層: integration <n>本 / acceptance <n>本（画面なしなら「画面なし」＋理由）

## 静的検知（Phase B）
- AC ↔ テストケース対応: [○/✗]  supertest 実 HTTP: [○/✗]  実装コンポーネント render: [○/✗]

## 実装不在での結果（Phase B）
$ pnpm --filter @staff-report/api test -- <path>
<生出力>  → 赤であること（コンパイルエラーではなくアサーション失敗の赤）

## 次のアクション
PM: 重量ゲートで diff を読む → 統合役がマージ → /brief <slice>
```

次は `/brief <slice>`。
