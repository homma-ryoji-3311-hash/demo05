import type { ZodType } from 'zod';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

/** OpenAPI の 1 レスポンス定義。schema 省略時は body なしレスポンス。 */
export interface RouteResponse {
  description: string;
  schema?: ZodType;
}

/**
 * 1 エンドポイント = 1 コントラクト。
 * Express 配線・リクエスト検証・OpenAPI 生成すべての単一ソース。
 * path は Express 形式（例 '/', '/:id/confirm'）で、mount 先の router からの相対パス。
 */
export interface RouteContract {
  method: HttpMethod;
  path: string;
  summary?: string;
  tags?: string[];
  operationId?: string;
  request?: {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
  };
  responses: Record<string, RouteResponse>;
}

/** 複数コントラクトを共通の basePath 配下でまとめる単位。OpenAPI 生成で使う。 */
export interface ContractGroup {
  basePath: string; // 例 '/api/reports'（app.ts の mount パスと一致させる）
  contracts: RouteContract[];
}
