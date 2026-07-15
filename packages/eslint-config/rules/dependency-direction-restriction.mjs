// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
/**
 * 特定npmパッケージのimportを許可された場所のみに制限するカスタムESLintルール
 *
 * 技術的関心事（ORM・AI SDK・通知SDK・Excel生成）を infrastructure/ に閉じ込め、
 * usecases や domain への漏れ込みを防ぐ。
 * 仕様の「AI処理は提供元非依存の抽象化層の背後で実行する」をルールとして強制する。
 *
 * 新しい制限を追加する場合は RESTRICTION_RULES に定義を追加するだけでよい。
 */

/**
 * コンポジションルート（依存の組み立て場所）か判定する
 * @param {string} filename
 * @returns {boolean}
 */
function isCompositionRoot(filename) {
  return filename.endsWith('/src/app.ts') || filename.endsWith('/src/main.ts');
}

/**
 * @typedef {Object} RestrictionRule
 * @property {string} label - エラーメッセージに表示する分類名
 * @property {string[]} packages - 制限対象パッケージ名（完全一致 or サブパス一致）
 * @property {string[]} [pathIncludes] - 相対importパスに含まれていたら制限対象とする文字列
 * @property {(filename: string) => boolean} isAllowed - 許可判定関数
 */

/** infrastructure 層のファイルか判定する（正式名 infrastructure/ と短縮形 infra/ の両方を許可） */
function isInfrastructureLayer(filename) {
  return filename.includes('/infrastructure/') || filename.includes('/infra/');
}

/** @type {RestrictionRule[]} */
const RESTRICTION_RULES = [
  {
    label: 'ORM・DBクライアント',
    packages: ['@prisma/client', '@prisma/adapter-pg', 'prisma', 'drizzle-orm', 'kysely', 'typeorm', 'pg', 'mysql2'],
    pathIncludes: ['generated/prisma'], // Prisma 7の生成クライアント（相対import）
    isAllowed: (filename) => isInfrastructureLayer(filename) || isCompositionRoot(filename),
  },
  {
    label: 'AI SDK',
    packages: ['@anthropic-ai/sdk', 'openai', '@google/genai', '@aws-sdk/client-bedrock-runtime'],
    isAllowed: (filename) => isInfrastructureLayer(filename),
  },
  {
    label: '通知SDK',
    packages: ['@slack/web-api', '@slack/bolt', 'nodemailer'],
    isAllowed: (filename) => isInfrastructureLayer(filename),
  },
  {
    label: 'Excel・ファイル生成',
    packages: ['exceljs', 'xlsx'],
    isAllowed: (filename) => isInfrastructureLayer(filename),
  },
  {
    label: 'オブジェクトストレージSDK',
    packages: ['@aws-sdk/client-s3', '@google-cloud/storage'],
    isAllowed: (filename) => isInfrastructureLayer(filename),
  },
];

/**
 * importPath が制限対象に一致するか判定する
 * （パッケージ名の完全一致 or `pkg/...`、または pathIncludes の部分一致）
 */
function matchesRule(importPath, rule) {
  if (rule.packages.some((pkg) => importPath === pkg || importPath.startsWith(`${pkg}/`))) {
    return true;
  }
  return (rule.pathIncludes ?? []).some((fragment) => importPath.includes(fragment));
}

/** @type {import('eslint').Rule.RuleModule} */
export const dependencyDirectionRestriction = {
  meta: {
    type: 'problem',
    docs: {
      description: '技術的関心事のパッケージimportを infrastructure/ に制限する',
    },
    messages: {
      restrictedPackage:
        '{{label}}（{{package}}）のimportは infrastructure/ 内でのみ許可されています。抽象化インターフェースを domain/ に定義し、実装を infrastructure/ に置いてください。',
    },
    schema: [],
  },
  create(context) {
    // Windows ではパス区切りが `\`（例: src\common\infra\...）のため、`/infra/` 等の判定が
    // 空振りして正当な infrastructure ファイルを誤検知する。判定前に `/` へ正規化する。
    const filename = context.filename.replace(/\\/g, '/');

    return {
      ImportDeclaration(node) {
        const importPath = String(node.source.value);

        for (const rule of RESTRICTION_RULES) {
          if (matchesRule(importPath, rule) && !rule.isAllowed(filename)) {
            context.report({
              messageId: 'restrictedPackage',
              node,
              data: { label: rule.label, package: importPath },
            });
            return;
          }
        }
      },
    };
  },
};
