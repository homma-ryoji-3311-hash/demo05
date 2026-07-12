# OpenAPI 自動生成ガイド（初学者向け）

このプロジェクトでは、API の仕様書（OpenAPI / Swagger UI）を **手書きせず、コードから自動で作って** います。

---

## 目次

1. [OpenAPI / Swagger UI とは（1分でわかる）](#1-openapi--swagger-ui-とは1分でわかる)
2. [まず動かして見てみる](#2-まず動かして見てみる)
3. [なぜこの仕組みなのか（二重管理をなくす）](#3-なぜこの仕組みなのか二重管理をなくす)
4. [全体像：1つのコントラクトから3つが生まれる](#4-全体像1つのコントラクトから3つが生まれる)
5. [ファイルの役割一覧](#5-ファイルの役割一覧)
6. [コントラクトの読み方](#6-コントラクトの読み方)
7. [新しいエンドポイントを追加する手順](#7-新しいエンドポイントを追加する手順)
8. [新しいフィーチャー（ドメイン）を追加するとき](#8-新しいフィーチャードメインを追加するとき)
9. [リクエスト検証とエラーの流れ](#9-リクエスト検証とエラーの流れ)
10. [よくある質問・ハマりどころ](#10-よくある質問ハマりどころ)
11. [用語集](#11-用語集)

---

## 1. OpenAPI / Swagger UI とは（1分でわかる）

- **OpenAPI** … 「この API はどんな URL で、どんなデータを受け取り、何を返すか」を機械が読める形式（JSON）で書いた **API の設計図** です。以前は「Swagger」と呼ばれていた仕様の後継です。
- **Swagger UI** … その設計図（OpenAPI の JSON）を、ブラウザで見やすく表示し、その場で「試しにリクエストを送る」こともできる **画面** です。

つまり OpenAPI が「データ」、Swagger UI が「それを表示するビューア」だと思ってください。

このプロジェクトでは次の 2 つの URL で見られます（サーバ起動後）。

| URL                                      | 中身                                        |
| ---------------------------------------- | ------------------------------------------- |
| `http://localhost:3000/api/docs`         | Swagger UI（人が見る画面）                  |
| `http://localhost:3000/api/openapi.json` | OpenAPI ドキュメント本体（機械が読む JSON） |

> ポート番号は環境変数によって変わることがあります。デフォルトは 3000 です。

---

## 2. まず動かして見てみる

```bash
# 1. 依存インストール & DB 準備（初回のみ。詳細は README を参照）
make setup

# 2. バックエンドを起動
pnpm --filter @staff-report/api dev
```

起動したらブラウザで `http://localhost:3000/api/docs` を開きます。
業務報告（reports）の 3 つの API が表示されるはずです。

- `POST /api/reports` … 報告を作成する
- `GET /api/reports` … スタッフの報告一覧を取得する
- `POST /api/reports/{id}/confirm` … 報告を確定する

各エンドポイントを開くと、リクエストの形（`staffId`, `body` など）やレスポンスの形（`Report`）、返りうるステータスコード（201 / 400 / 404 / 409 / 500）まで表示されます。
**これらは手で書いたものではなく、コードから自動生成されたもの** です。

---

## 3. なぜこの仕組みなのか（二重管理をなくす）

API を作るとき、普通は次の情報が「同じ内容なのに別々の場所」に散らばりがちです。

1. Express のルーティング（どの URL でどの処理を呼ぶか）
2. リクエストの検証（`staffId` は必須、`body` は空じゃダメ…）
3. API 仕様書（OpenAPI）の記述

これらを別々に書くと、片方だけ直して片方を直し忘れる「**二重管理**」が起きます。仕様書だけ古い、というのはよくある事故です。

そこでこのプロジェクトでは、**1 つの「コントラクト（contract）」という定義を唯一の正（単一ソース）** とし、そこから上の 3 つをすべて導き出します。コントラクトを直せば、ルーティングも検証も仕様書も同時に更新されます。

> 補足：同じ目的のライブラリに `ts-rest` や `tsoa` もありますが、このプロジェクトの Express 5 / Zod 4 の組み合わせに正式対応していなかったため、Zod 4 対応の [`zod-openapi`](https://github.com/samchungy/zod-openapi) を使って最小構成で自作しています。経緯は `docs/superpowers/specs/2026-07-11-zod4-openapi-auto-generation-design.md` に記録があります。

---

## 4. 全体像：1つのコントラクトから3つが生まれる

```
                  ┌────────────────────────────┐
                  │   reportContract           │  ← ここだけが「正」（単一ソース）
                  │   （Zodスキーマ + メタ情報）│
                  └──────────────┬─────────────┘
             ┌───────────────────┼────────────────────┐
             ▼                   ▼                     ▼
    ① registerRoute      ① registerRoute        ② buildOpenApiDocument
      （Expressに配線）    （Zodで入力検証）        （OpenAPI JSON を生成）
             │                                          │
             ▼                                          ▼
     実際のHTTPルート                         /api/openapi.json → Swagger UI
```

- **①`registerRoute`**：コントラクトを読んで「Express のルート」を1本作り、リクエストを Zod で検証してからコントローラに渡します。
- **②`buildOpenApiDocument`**：同じコントラクトを読んで「OpenAPI の JSON」を組み立てます。

同じコントラクトを2方向から読むだけなので、ズレようがありません。これが「二重管理なし」の正体です。

> コード生成のビルドコマンドは **不要** です。OpenAPI はサーバ起動時にコントラクトから毎回組み立てられます。

---

## 5. ファイルの役割一覧

OpenAPI まわりのファイルは 2 か所に分かれています。

### 共通の仕組み（フィーチャーに依存しない部品）

`apps/service/src/shared/interfaceAdapter/api/openapi/`

| ファイル                  | 役割                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `contractTypes.ts`        | コントラクトの「型」の定義（`RouteContract` / `ContractGroup` など）。どんなエンドポイントも表せる汎用の器。            |
| `registerRoute.ts`        | コントラクト1つを受け取り、Express ルート＋Zod 検証を作る汎用アダプタ。                                                 |
| `buildOpenApiDocument.ts` | コントラクト一覧から OpenAPI 3.1 の JSON を生成する。Express の `:id` を OpenAPI の `{id}` に変換するなどの変換もここ。 |
| `route/docsRoute.ts`      | `/api/openapi.json` と `/api/docs`（Swagger UI）を配信する。                                                            |

### 業務報告（report）フィーチャー固有

`apps/service/src/template/interfaceAdapter/api/`

> `template/` は「業務報告」フィーチャーのディレクトリです（他のドメインを作るときの雛形も兼ねています）。

| ファイル                         | 役割                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `contract/reportContract.ts`     | **report の単一ソース**。スキーマ（`reportSchema` など）と 3 エンドポイントの定義。                       |
| `controller/reportController.ts` | HTTP ⇔ ユースケースの変換。Express の型には依存せず、検証済みの入力を受け取り `{ status, body }` を返す。 |
| `route/reportRoute.ts`           | コントラクトとコントローラを `registerRoute` で結線するだけ。                                             |

そして `apps/service/src/app.ts`（アプリの組み立て役）で、report のコントラクトを OpenAPI 生成に渡しています。

---

## 6. コントラクトの読み方

`reportContract.ts` の「作成」エンドポイントを例に見てみます。

```ts
// apps/service/src/template/interfaceAdapter/api/contract/reportContract.ts

// リクエストボディのスキーマ（Zod）。これが検証にもドキュメントにも使われる
export const createReportBodySchema = z
  .object({
    staffId: z.string().min(1), // 1文字以上（空はNG）
    body: z.string().min(1),
  })
  .meta({ id: 'CreateReportBody' }); // .meta の id を付けると OpenAPI で再利用可能な部品になる

// レスポンス（Report）のスキーマ
export const reportSchema = z
  .object({
    id: z.string(),
    staffId: z.string(),
    body: z.string(),
    status: z.enum(['draft', 'confirmed']),
    createdAt: z.iso.datetime(), // ISO日時文字列
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'Report' });

export const reportContract = {
  create: {
    method: 'post', // HTTPメソッド
    path: '/', // ルーターからの相対パス（/api/reports に mount される）
    summary: '報告を作成する', // Swagger UI に出る説明
    tags: ['reports'], // Swagger UI 上のグループ分け
    operationId: 'createReport',
    request: { body: createReportBodySchema }, // 受け取るデータ
    responses: {
      // 返しうるレスポンス（ステータスコードごと）
      '201': { description: '作成された報告', schema: reportSchema },
      '400': { description: 'バリデーションエラー', schema: errorSchema },
      '500': { description: 'サーバエラー', schema: errorSchema },
    },
  },
  // list, confirm も同様に定義...
} satisfies Record<string, RouteContract>;
```

ポイント：

- `request.body` / `request.params` / `request.query` に Zod スキーマを置くと、**その場所のデータが自動で検証** されます。
- `responses` に書いたステータス・スキーマが、そのまま **OpenAPI のレスポンス欄** になります。
- `.meta({ id: '...' })` を付けたスキーマは、OpenAPI の `components.schemas`（再利用できる部品）に登録されます（例：`Report`, `Error`）。

最後に、フィーチャー内の全エンドポイントを 1 つのグループにまとめます。

```ts
export const reportContractGroup: ContractGroup = {
  basePath: '/api/reports', // このグループが mount される URL の先頭
  contracts: Object.values(reportContract), // create / list / confirm を自動で列挙
};
```

> `Object.values(reportContract)` にしているのは、**エンドポイントの列挙漏れを防ぐため** です。手で配列に足す方式だと「ルートは動くのに OpenAPI に出てこない」という不整合が起きえます。

---

## 7. 新しいエンドポイントを追加する手順

例として「1 件の報告を取得する `GET /api/reports/{id}`」を足すとします。触るのは基本 **2 ファイルだけ**（＋対応するユースケースがなければそれも用意）。

### Step 1. ユースケースを用意する（まだなければ）

`template/usecases/getReport.ts` などにビジネスロジックを実装します（このガイドの本題は API 層なので詳細は省略）。

### Step 2. コントラクトに定義を足す

`contract/reportContract.ts` の `reportContract` に 1 エントリ追加します。

```ts
export const getReportParamsSchema = z.object({ id: z.string().min(1) });
export type GetReportParams = z.infer<typeof getReportParamsSchema>;

export const reportContract = {
  // ...既存の create / list / confirm...
  get: {
    method: 'get',
    path: '/:id',
    summary: '報告を1件取得する',
    tags: ['reports'],
    operationId: 'getReport',
    request: { params: getReportParamsSchema },
    responses: {
      '200': { description: '報告', schema: reportSchema },
      '404': { description: '報告が存在しない', schema: errorSchema },
      '500': { description: 'サーバエラー', schema: errorSchema },
    },
  },
} satisfies Record<string, RouteContract>;
```

`contracts: Object.values(reportContract)` にしているので、**この時点で OpenAPI には自動で反映** されます（配列を手で直す必要はありません）。

### Step 3. コントローラにメソッドを足す

`controller/reportController.ts` に、検証済み入力を受け取って `{ status, body }` を返すメソッドを追加します。

```ts
async get(input: GetReportParams): Promise<HandlerResult> {
  const report = await this.getReport.execute(input.id);
  return { status: 200, body: report.toJSON() };
}
```

### Step 4. ルートに結線する

`route/reportRoute.ts` に 1 行足します。

```ts
registerRoute(
  router,
  reportContract.get,
  (input) => reportController.get(input.params as GetReportParams),
  toReportHttpException,
);
```

### Step 5. 確認する

```bash
pnpm --filter @staff-report/api typecheck   # 型が通るか
pnpm --filter @staff-report/api test        # テストが通るか
```

サーバを再起動して `http://localhost:3000/api/docs` を開くと、新しい `GET /api/reports/{id}` が追加されているはずです。

> TDD（テスト先行）を推奨します。まず失敗するテストを書いてから実装する流れは、既存のテストファイル（`__tests__/`）が参考になります。

---

## 8. 新しいフィーチャー（ドメイン）を追加するとき

report 以外の新しいドメイン（例：`skillsheet`）を足す場合は、そのフィーチャーにも `xxxContract.ts` と `xxxContractGroup` を作り、**アプリの組み立て役 `app.ts` で OpenAPI 生成に渡します**。

```ts
// apps/service/src/app.ts（抜粋）
app.use('/api', createDocsRouter([reportContractGroup /*, skillsheetContractGroup */]));
```

`createDocsRouter` はコントラクトグループの配列を受け取る形（依存性注入）になっています。
こうすることで **共通部品（shared）が個別フィーチャー（template など）に依存しない**、きれいな依存方向を保っています。フィーチャーを足すときに触るのはこの配列だけです。

---

## 9. リクエスト検証とエラーの流れ

「どこで 400 / 404 / 409 が決まるのか」を整理します。

```
リクエスト
   │
   ▼
registerRoute が request スキーマで検証
   │  └─ 検証NG → ZodError を throw
   ▼
コントローラ → ユースケース → ドメイン
   │  └─ 業務ルール違反 → ドメインエラーを throw
   │       （例：本文が空 / 報告が無い / 確定済み）
   ▼
throw されたエラーは reportRoute の mapError（= toReportHttpException）を通り…
   │
   ▼
共通の error-handler がレスポンスに変換
```

対応表：

| 発生源          | エラー                                    | HTTP                            |
| --------------- | ----------------------------------------- | ------------------------------- |
| 入力検証（Zod） | `ZodError`                                | **400**（`{ error, details }`） |
| ドメイン        | `EmptyReportBodyError`（本文が空）        | **400**                         |
| ドメイン        | `ReportNotFoundError`（報告が無い）       | **404**                         |
| ドメイン        | `ReportAlreadyConfirmedError`（確定済み） | **409**                         |
| 想定外          | その他                                    | **500**                         |

- 入力の検証ルール（必須・最小文字数など）は **コントラクトの Zod スキーマ** に書きます。
- 業務ルール（確定済みは再確定できない等）は **ドメイン層** に書きます。API 層には業務ルールを書きません。
- これらのステータスは、コントラクトの `responses` にも書いておくと OpenAPI が正確になります（実際のエラー変換とドキュメントの両方が揃う）。

---

## 11. 用語集

| 用語                                 | 意味                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI                              | API の設計図を機械可読な形式で書いた仕様。旧称 Swagger。                                                                                           |
| Swagger UI                           | OpenAPI をブラウザで見る・試すための画面。                                                                                                         |
| Zod                                  | TypeScript のスキーマ検証ライブラリ。実行時の入力検証と型推論を担う。                                                                              |
| コントラクト（contract）             | このプロジェクトでの「エンドポイント1つの定義」。検証・ルーティング・ドキュメントの単一ソース。                                                    |
| 単一ソース（Single Source of Truth） | 同じ情報を1か所だけで管理し、そこから他を導く考え方。二重管理を防ぐ。                                                                              |
| ContractGroup                        | 同じ `basePath` 配下のコントラクトをまとめたもの。フィーチャー単位。                                                                               |
| 依存性注入（DI）                     | 必要なものを外から渡す設計。ここでは `createDocsRouter` にコントラクトグループを渡すことで、共通部品が個別フィーチャーに依存しないようにしている。 |

---
