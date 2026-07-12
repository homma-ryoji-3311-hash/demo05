// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
/**
 * UseCase の命名規則を強制するルール
 *
 * - usecases/ 内のexportされたクラス名は "UseCase" サフィックス必須
 * - ファイル名はクラス名から UseCase を省いた camelCase
 *   （例: SubmitUseCase → submit.ts, CreateReportUseCase → createReport.ts）
 */

/**
 * 先頭文字を小文字にする（CreateReport → createReport）
 * @param {string} name
 * @returns {string}
 */
function lowerFirst(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** @type {import('eslint').Rule.RuleModule} */
export const usecaseNamingConvention = {
  meta: {
    type: 'problem',
    docs: {
      description: 'usecases/ 内の UseCase 命名規則を強制する',
    },
    messages: {
      invalidClassNameSuffix:
        'usecasesディレクトリ内のクラスには"UseCase"サフィックスが必要です。検出されたクラス名: "{{className}}"',
      invalidFileName:
        'ファイル名が正しくありません。クラス名"{{className}}"に対して、ファイル名は"{{expectedFileName}}.ts"である必要があります。現在のファイル名: "{{currentFileName}}.ts"',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/usecases/')) return {};

    return {
      ClassDeclaration(node) {
        if (!node.id) return;

        const parent = node.parent;
        const isExported = parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration';
        if (!isExported) return;

        const className = node.id.name;

        if (!className.endsWith('UseCase')) {
          context.report({
            messageId: 'invalidClassNameSuffix',
            node: node.id,
            data: { className },
          });
          return;
        }

        const baseName = className.replace(/UseCase$/, '');
        const expectedFileName = lowerFirst(baseName);
        const currentFileName = filename.split('/').pop().replace(/\.ts$/, '');

        if (currentFileName !== expectedFileName) {
          context.report({
            messageId: 'invalidFileName',
            node: node.id,
            data: { className, expectedFileName, currentFileName },
          });
        }
      },
    };
  },
};
