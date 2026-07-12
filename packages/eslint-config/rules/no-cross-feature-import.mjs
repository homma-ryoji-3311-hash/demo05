// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
import path from 'node:path';

/**
 * フィーチャー間の直接importを禁止するカスタムESLintルール
 *
 * src/<feature>/ 配下のコードは、他のフィーチャーの内部に直接importで
 * 手を伸ばしてはいけない。共有したいものは src/shared/ に置くか、
 * インターフェースを定義してコンポジションルート (app.ts) で注入する。
 *
 * - report → shared: OK
 * - report → skillSheet: NG
 * - shared → report: NG（sharedはフィーチャーに依存しない）
 */

// 共有ディレクトリ名。正式名 shared と別名 common の両方をフィーチャー非依存の共有置き場として扱う。
const SHARED_DIRS = new Set(['shared', 'common']);

/** フィーチャーとして扱わない src/ 直下のディレクトリ */
const NON_FEATURE_DIRS = new Set(['__tests__', '__test__', 'generated', 'app']);

/**
 * 絶対パスから src/ 直下のセグメント（フィーチャー名）を返す
 * - src/<feature>/...            → <feature>
 * - src/features/<feature>/...   → <feature>（features ラッパ構成に対応）
 * - src/直下のファイル・__tests__・generated・app はフィーチャーではないので null
 * @param {string} absolutePath
 * @returns {string | null}
 */
function featureOf(absolutePath) {
  const normalized = absolutePath.split(path.sep).join('/');
  const wrapped = normalized.match(/\/src\/features\/([^/]+)\//);
  if (wrapped) {
    const wrappedFeature = wrapped[1] ?? null;
    return wrappedFeature !== null && NON_FEATURE_DIRS.has(wrappedFeature) ? null : wrappedFeature;
  }
  const match = normalized.match(/\/src\/([^/]+)\//);
  const feature = match ? (match[1] ?? null) : null;
  return feature !== null && NON_FEATURE_DIRS.has(feature) ? null : feature;
}

/** @type {import('eslint').Rule.RuleModule} */
export const noCrossFeatureImport = {
  meta: {
    type: 'problem',
    docs: {
      description: 'フィーチャー間の直接importを禁止する（共有は common/ 経由か注入で）',
    },
    messages: {
      crossFeatureImport:
        'フィーチャー "{{sourceFeature}}" から "{{targetFeature}}" への直接importは禁止されています。共有コードは common/ に置くか、インターフェースを定義して app.ts で注入してください。',
      sharedDependsOnFeature:
        '共有ディレクトリからフィーチャー "{{targetFeature}}" へのimportは禁止されています。共有コードはどのフィーチャーにも依存できません。',
    },
    schema: [],
  },
  create(context) {
    const sourceFeature = featureOf(context.filename);

    if (!sourceFeature) return {};

    return {
      ImportDeclaration(node) {
        const importPath = String(node.source.value);
        if (!importPath.startsWith('.')) return;

        const resolved = path.resolve(path.dirname(context.filename), importPath);
        const targetFeature = featureOf(resolved);

        if (!targetFeature || targetFeature === sourceFeature) return;

        if (SHARED_DIRS.has(sourceFeature)) {
          context.report({
            messageId: 'sharedDependsOnFeature',
            node,
            data: { targetFeature },
          });
          return;
        }

        if (!SHARED_DIRS.has(targetFeature)) {
          context.report({
            messageId: 'crossFeatureImport',
            node,
            data: { sourceFeature, targetFeature },
          });
        }
      },
    };
  },
};
