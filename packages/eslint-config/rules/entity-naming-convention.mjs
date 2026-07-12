// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
/**
 * エンティティの命名規則を強制するルール
 *
 * - domain/model/ 内のexportされたクラス名は "DomainEntity" サフィックス必須
 * - ファイル名はクラス名と対応（例: ReportDomainEntity → report.ts）
 */

/** @type {import('eslint').Rule.RuleModule} */
export const entityNamingConvention = {
  meta: {
    type: 'problem',
    docs: {
      description: 'domain/model/ 内のエンティティ命名規則を強制する',
    },
    messages: {
      invalidClassNameSuffix:
        'domain/modelディレクトリ内のクラスには"DomainEntity"サフィックスが必要です。検出されたクラス名: "{{className}}"',
      invalidFileName:
        'ファイル名が正しくありません。クラス名"{{className}}"に対して、ファイル名は"{{expectedFileName}}.ts"である必要があります。現在のファイル名: "{{currentFileName}}.ts"',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/domain/model/')) return {};

    return {
      ClassDeclaration(node) {
        if (!node.id) return;

        const parent = node.parent;
        const isExported = parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration';
        if (!isExported) return;

        const className = node.id.name;

        if (!className.endsWith('DomainEntity')) {
          context.report({
            messageId: 'invalidClassNameSuffix',
            node: node.id,
            data: { className },
          });
          return;
        }

        // ファイル名との対応チェック（ReportDomainEntity → report.ts）
        const baseName = className.replace(/DomainEntity$/, '');
        const expectedFileName = baseName.charAt(0).toLowerCase() + baseName.slice(1);
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
