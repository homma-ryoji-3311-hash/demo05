---
slice: slice-02-report-summarize
approved: false
---

# slice-02 report-summarize — AI要約（Summarizer 抽象化層）

> 振る舞いの正本: `reference-mock/spec.md §3.3・§5` / `reference-mock/phase1-plan.md` ステップ6。
> Summarizer 境界は `docs/design/overview.md §5`。依存: slice-01。

## AC-1 下書きを要約すると構造化 JSON が返る

- source: reference-mock        # phase1-plan ステップ6・spec.md §3.3
- **Given** 自分の下書き報告（raw_text あり）
- **When** `POST /reports/:id/summarize` を呼ぶ
- **Then** `200` が返り、`{ incidents[], achievements[], issues[], skills[] }` 形式の要約 JSON が返る

## AC-2 出力は固定スキーマに準拠する（提供元非依存）

- source: reference-mock        # 原則2・3。抽象化層の背後で呼ぶ
- **Given** Summarizer 抽象化層（1プロバイダ実装）
- **When** 任意の本文を要約する
- **Then** 出力は上記4カテゴリの固定 JSON スキーマに一致し、プロバイダ名はレスポンスに現れない

## AC-3 本文にない数値・事実を創作しない

- source: reference-mock        # spec.md §5・report-quality §5.4
- **Given** 数値を含まない本文
- **When** 要約する
- **Then** 数値・固有事実を補完せず、該当項目は空のまま返る

## AC-4 要約に失敗しても下書きは失われない

- source: PM        # ★失敗コード 502・下書き保持は overview §3 の新規決定
- 理由: 参照モックはコードを規定しないが、spec.md §6.3「AI 失敗時も入力内容を失わない」を守る。
- **Given** Summarizer がエラーを返す状況
- **When** `POST /reports/:id/summarize` を呼ぶ
- **Then** `502` が返り、報告は `status=draft` のまま保持される

## 画面要件

- 対象画面: S4 AI要約 確認・編集（の要約結果表示部）。編集・確定は slice-03。
- golden 撮影: 可（要約結果の表示領域）
- **UI-AC（source: PM）**
  - 「要約する」操作で抽象化層を呼び、4カテゴリの結果が画面に表示される。
  - 要約中・失敗の状態がテキストで示され、失敗時も入力本文は画面上で保持される。

## 合成フィクスチャ（PM 所有）

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| report.raw_text | L0 | `ダッシュボード改修を対応。レビュー指摘を修正し再デプロイ。` | 合成本文 |
| summary.incidents | L0 | `[]` | 例では空 |
| summary.achievements | L0 | `["ダッシュボード改修を完了"]` | 数値創作なし |
| summary.skills | L0 | `["フロントエンド"]` | — |

> Summarizer はテストでは**決定的なスタブ/フェイク**に差し替える（実プロバイダ・実キーを CI に持ち込まない）。
