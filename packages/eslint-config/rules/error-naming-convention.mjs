// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
/**
 * ドメインエラーの定義規約を強制するルール
 *
 * domain/error/ 内のexportされたクラスに以下を強制する:
 * - Error を直接 extends する（基底クラスを挟まない）
 * - クラス名は "Error" サフィックス必須
 * - ファイル名はクラス名の先頭を小文字にしたもの（例: ReportAlreadyConfirmedError → reportAlreadyConfirmedError.ts）
 * - コンストラクタで this.name = 'クラス名' を設定する（ログでエラー名を識別可能にするため）
 */

/**
 * 先頭文字を小文字にする（ReportAlreadyConfirmedError → reportAlreadyConfirmedError）
 * @param {string} name
 * @returns {string}
 */
function lowerFirst(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * コンストラクタ内に this.name = '<className>' の代入があるか調べる
 * @param {object} classBody
 * @param {string} className
 * @returns {boolean}
 */
function hasNameAssignment(classBody, className) {
  const ctor = classBody.body.find((member) => member.type === 'MethodDefinition' && member.kind === 'constructor');
  if (!ctor?.value?.body?.body) return false;

  return ctor.value.body.body.some(
    (statement) =>
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'AssignmentExpression' &&
      statement.expression.left.type === 'MemberExpression' &&
      statement.expression.left.object.type === 'ThisExpression' &&
      statement.expression.left.property.type === 'Identifier' &&
      statement.expression.left.property.name === 'name' &&
      statement.expression.right.type === 'Literal' &&
      statement.expression.right.value === className,
  );
}

/** @type {import('eslint').Rule.RuleModule} */
export const errorNamingConvention = {
  meta: {
    type: 'problem',
    docs: {
      description: 'domain/error/ 内のドメインエラー定義規約を強制する',
    },
    messages: {
      invalidSuperClass:
        'ドメインエラーは Error を直接 extends してください。基底クラスを挟まず、クラス名で業務的な意味を表現します。検出されたクラス名: "{{className}}"',
      invalidClassNameSuffix:
        'domain/error/ 内のクラスには"Error"サフィックスが必要です。検出されたクラス名: "{{className}}"',
      invalidFileName:
        'ファイル名が正しくありません。クラス名"{{className}}"に対して、ファイル名は"{{expectedFileName}}.ts"である必要があります。現在のファイル名: "{{currentFileName}}.ts"',
      missingNameAssignment:
        "コンストラクタで this.name = '{{className}}' を設定してください。設定しないとログやスタックトレースで 'Error' としか表示されません。",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes('/domain/error/')) return {};

    return {
      ClassDeclaration(node) {
        if (!node.id) return;

        const parent = node.parent;
        const isExported = parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration';
        if (!isExported) return;

        const className = node.id.name;

        if (!node.superClass || node.superClass.type !== 'Identifier' || node.superClass.name !== 'Error') {
          context.report({
            messageId: 'invalidSuperClass',
            node: node.id,
            data: { className },
          });
        }

        if (!className.endsWith('Error')) {
          context.report({
            messageId: 'invalidClassNameSuffix',
            node: node.id,
            data: { className },
          });
          return;
        }

        const expectedFileName = lowerFirst(className);
        const currentFileName = filename.split('/').pop().replace(/\.ts$/, '');

        if (currentFileName !== expectedFileName) {
          context.report({
            messageId: 'invalidFileName',
            node: node.id,
            data: { className, expectedFileName, currentFileName },
          });
        }

        if (!hasNameAssignment(node.body, className)) {
          context.report({
            messageId: 'missingNameAssignment',
            node: node.id,
            data: { className },
          });
        }
      },
    };
  },
};
