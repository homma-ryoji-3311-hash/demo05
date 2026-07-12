// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
/**
 * 生のErrorクラスのthrowを禁止するカスタムESLintルール
 *
 * `throw new Error()` / `throw Error()` を禁止し、
 * 各フィーチャーの domain/error/ に定義した業務固有の
 * カスタムエラークラスの使用を強制する。
 */

/** @type {import('eslint').Rule.RuleModule} */
export const noRawErrorThrow = {
  meta: {
    type: 'problem',
    docs: {
      description: 'throw new Error() を禁止し、カスタムエラークラスの使用を強制する',
    },
    messages: {
      noRawError:
        '生のErrorクラスのthrowは禁止です。業務的な意味を表現したカスタムエラークラスを各フィーチャーの domain/error/ に定義して使用してください。',
    },
    schema: [],
  },
  create(context) {
    return {
      ThrowStatement(node) {
        const argument = node.argument;
        if (!argument) return;

        // throw new Error(...) のパターン
        if (
          argument.type === 'NewExpression' &&
          argument.callee.type === 'Identifier' &&
          argument.callee.name === 'Error'
        ) {
          context.report({ messageId: 'noRawError', node });
        }

        // throw Error(...) のパターン
        if (
          argument.type === 'CallExpression' &&
          argument.callee.type === 'Identifier' &&
          argument.callee.name === 'Error'
        ) {
          context.report({ messageId: 'noRawError', node });
        }
      },
    };
  },
};
