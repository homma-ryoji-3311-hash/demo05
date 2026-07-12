// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
/**
 * Integration Test での vi.mock / vi.fn / vi.spyOn 使用を禁止するカスタムESLintルール
 *
 * Integration Test は実物または InMemory 実装を使用する。
 * スタブ化によるモックはテストの信頼性を損なうため禁止。
 *
 * 適用範囲は architecture.mjs の files パターンで制御する
 * （*.integration.test.ts / integration/ ディレクトリ配下）。
 */

/** @type {import('eslint').Rule.RuleModule} */
export const noVitestMockInIntegration = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Integration Test で vi.mock / vi.fn / vi.spyOn の使用を禁止する',
    },
    messages: {
      noMock: 'Integration Test でのモック（vi.{{method}}）は禁止です。実物または InMemory 実装を使用してください。',
    },
    schema: [],
  },
  create(context) {
    const BANNED_METHODS = ['mock', 'doMock', 'fn', 'spyOn'];

    return {
      CallExpression(node) {
        const callee = node.callee;

        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'vi' &&
          callee.property.type === 'Identifier' &&
          BANNED_METHODS.includes(callee.property.name)
        ) {
          context.report({
            node,
            messageId: 'noMock',
            data: { method: callee.property.name },
          });
        }
      },
    };
  },
};
