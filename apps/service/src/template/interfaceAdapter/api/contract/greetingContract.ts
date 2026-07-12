import * as z from 'zod';
import type { ContractGroup, RouteContract } from '../../../../common/interfaceAdapter/api/openapi/contractTypes.js';

/**
 * 「コントラクト」定義ファイル。
 *
 * ■ コントラクトとは
 *   1 エンドポイント = 1 コントラクト。パス・HTTP メソッド・リクエスト検証・
 *   レスポンス形・OpenAPI ドキュメントの「単一ソース（single source of truth）」。
 *   ここに書いた内容から次の 3 つが自動的に導かれる:
 *     1. Express のルーティングと URL 定義（route/greetingRoute.ts が registerRoute で結線）
 *     2. リクエストの Zod バリデーション（registerRoute が request.* を自動 parse）
 *     3. OpenAPI 3.1 ドキュメント / Swagger UI（common/.../buildOpenApiDocument が生成）
 *   → スキーマとドキュメントの二重管理をなくすのが狙い。ここだけ直せば全部追従する。
 */

// ============================================================
// スキーマ（単一ソース）
//   リクエスト/レスポンスの形はすべて Zod で定義する。
//   z.infer で TypeScript の型も同じ定義から導けるため、型とバリデーションがずれない。
// ============================================================

/**
 * あいさつレスポンスのスキーマ。
 *
 * `.meta({ id: 'Greeting' })` を付けると、OpenAPI 上で `components/schemas/Greeting`
 * という再利用可能なコンポーネントとして登録される（複数の場所で参照しても 1 定義に集約される）。
 * id を付けない場合はインラインスキーマとして展開される。
 *
 * createdAt は Date だが、レスポンスは JSON 化され ISO 文字列になるため、
 * スキーマ上は `z.iso.datetime()`（ISO 8601 の文字列）で表現している。
 */
export const greetingSchema = z
  .object({
    id: z.string(),
    message: z.string(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Greeting' });

/** レスポンス(200)の型。コントローラの戻り値をこの型に固定し、スキーマとのズレをコンパイル時に検出する。 */
export type Greeting = z.infer<typeof greetingSchema>;

/**
 * 共通エラーレスポンスのスキーマ。
 * error-handler ミドルウェアが返すエラー形（{ error, details? }）に対応する。
 * これも `.meta({ id: 'Error' })` で OpenAPI コンポーネント化し、各エンドポイントの
 * 4xx/5xx レスポンスから使い回す。
 */
const errorSchema = z
  .object({
    error: z.string(),
    details: z.array(z.unknown()).optional(),
  })
  .meta({ id: 'Error' });

// ============================================================
// コントラクト
//   各エンドポイントの定義本体。`satisfies Record<string, RouteContract>` により、
//   RouteContract の形（method/path/responses など）を外れると型エラーで気付ける。
//   キー（hello など）は route/controller から参照するための識別子。
// ============================================================

export const greetingContract = {
  hello: {
    // HTTP メソッド。'get' | 'post' | 'put' | 'delete' | 'patch'
    method: 'get',
    // マウント先 router からの相対パス（Express 形式）。
    // app.ts で '/api/hello' にマウントしているので、'/' で最終的に GET /api/hello になる。
    // パスパラメータがある場合は '/:id' のように書く。
    path: '/',
    // OpenAPI 上の要約。Swagger UI の各操作の見出しに出る。
    summary: 'Hello World のあいさつを取得する',
    // OpenAPI のタグ。Swagger UI 上でこのタグごとにエンドポイントがグルーピングされる。
    tags: ['greeting'],
    // 操作の一意 ID。クライアントコード自動生成時のメソッド名などに使われる。
    operationId: 'getGreeting',
    // リクエスト検証の定義（このエンドポイントは入力を取らないので request は無し）。
    // body / params / query に Zod スキーマを置くと、registerRoute が受信時に自動 parse し、
    // 失敗すれば ZodError を throw → error-handler が 400 に変換する。
    //   例: request: { body: createGreetingBodySchema }
    //       request: { params: someParamsSchema, query: someQuerySchema }
    // 検証済みの値は controller のハンドラに input として渡る。
    responses: {
      // ステータスコード → { description, schema? }。
      // schema を付けるとレスポンスボディの形として OpenAPI に載る（省略時はボディ無し）。
      '200': { description: 'あいさつ', schema: greetingSchema },
      '500': { description: 'サーバエラー', schema: errorSchema },
    },
  },
} satisfies Record<string, RouteContract>;

/**
 * このフィーチャーのコントラクト群を 1 つの basePath 配下でまとめたもの。
 * app.ts（コンポジションルート）が createDocsRouter に渡し、OpenAPI 生成に使う。
 *
 * basePath は app.ts の実際のマウントパス（app.use('/api/hello', ...)）と必ず一致させること。
 * ここがずれると Swagger 上のパスと実際のパスが食い違う。
 *
 * エンドポイントを増やしたら Object.values で自動的に全コントラクトが含まれるので、
 * greetingContract にキーを足すだけで OpenAPI にも反映される。
 */
export const greetingContractGroup: ContractGroup = {
  basePath: '/api/hello',
  contracts: Object.values(greetingContract),
};
