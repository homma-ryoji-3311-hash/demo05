// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
/**
 * domain/interface/ の命名規則を強制するルール
 *
 * - domain/interface/ 内のexportされたインターフェース名は "Interface" サフィックス必須
 *   （実装クラスと同名で衝突させず、抽象と実装を名前で区別する）
 * - ファイル名はインターフェース名から Interface を省いた camelCase
 *   （例: GreetingRepositoryInterface → greetingRepository.ts）
 */

/**
 * 先頭文字を小文字にする（GreetingRepository → greetingRepository）
 * @param {string} name
 * @returns {string}
 */
function lowerFirst(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** @type {import('eslint').Rule.RuleModule} */
export const interfaceNamingConvention = {
  meta: {
    type: 'problem',
    docs: {
      description: 'domain/interface/ 内のインターフェース命名規則を強制する',
    },
    messages: {
      invalidInterfaceNameSuffix:
        'domain/interface/ 内のインターフェースには"Interface"サフィックスが必要です。検出された名前: "{{interfaceName}}"',
      invalidFileName:
        'ファイル名が正しくありません。インターフェース名"{{interfaceName}}"に対して、ファイル名は"{{expectedFileName}}.ts"である必要があります。現在のファイル名: "{{currentFileName}}.ts"',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/domain/interface/')) return {};

    return {
      TSInterfaceDeclaration(node) {
        if (!node.id) return;

        const parent = node.parent;
        const isExported = parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration';
        if (!isExported) return;

        const interfaceName = node.id.name;

        if (!interfaceName.endsWith('Interface')) {
          context.report({
            messageId: 'invalidInterfaceNameSuffix',
            node: node.id,
            data: { interfaceName },
          });
          return;
        }

        const baseName = interfaceName.replace(/Interface$/, '');
        const expectedFileName = lowerFirst(baseName);
        const currentFileName = filename.split('/').pop().replace(/\.ts$/, '');

        if (currentFileName !== expectedFileName) {
          context.report({
            messageId: 'invalidFileName',
            node: node.id,
            data: { interfaceName, expectedFileName, currentFileName },
          });
        }
      },
    };
  },
};
