---
slice: slice-05-previous-reference
approved: false
---

# slice-05 previous-reference — 前回入力・前回要約の参照

> 振る舞いの正本: `reference-mock/spec.md §3.2`。依存: slice-01・slice-03。

## AC-1 前回の本文と前回 AI 要約を読み取り専用で取得できる

- source: reference-mock        # spec.md §3.2「前回入力の保持」
- **Given** 自分の確定済み報告が過去に1件以上ある
- **When** `GET /reports/:id/previous` を呼ぶ
- **Then** `200` が返り、直近の確定報告の `raw_text` と要約が読み取り専用として返る

## AC-2 前回が存在しない場合は「なし」を返す

- source: PM        # ★初回時の返却形は overview §3 の新規決定
- 理由: 参照モックは初回時の挙動を明記しない。前回なしは空（`null`/空配列）で返し、エラーにしない。
- **Given** 過去の確定報告が無いスタッフ
- **When** `GET /reports/:id/previous` を呼ぶ
- **Then** `200` が返り、前回情報は「なし」を示す空の値になる

## 画面要件

- 対象画面: S3 業務報告入力（前回参照の表示領域）
- golden 撮影: 可
- **UI-AC（source: PM）**
  - 前回本文・前回要約が**控えめな読み取り専用表示**で示され、丸写しを誘発しない（spec.md §3.2）。
  - 前回が無いときは参照領域に「前回の報告はありません」等が表示される。

## 合成フィクスチャ（PM 所有）

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| prev.raw_text | L0 | `前日はテスト整備を実施。` | 合成 |
| prev.summary | L0 | `{achievements:["テスト整備"]}` | 読み取り専用参照 |
