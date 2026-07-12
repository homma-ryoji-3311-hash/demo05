// @ts-nocheck — ESLint ルールAPIの型はJSDocでは表現しきれないため
/**
 * レイヤー間の依存方向を制限するカスタムESLintルール
 *
 * staff-report のクリーンアーキテクチャに基づき、以下の依存方向のみ許可する:
 *
 *   interfaceAdapter → usecases → domain ← infrastructure
 *
 * 禁止される依存:
 *   - domain → usecases, infrastructure, interfaceAdapter
 *   - usecases → infrastructure, interfaceAdapter
 *   - infrastructure → usecases, interfaceAdapter
 *   - interfaceAdapter → infrastructure
 *
 * コンポジションルート (src/app.ts, src/main.ts) はレイヤー外なので対象外。
 */

// infrastructure 層は正式名 /infrastructure/ と短縮形 /infra/ の両方を同一レイヤーとして扱う。
const INFRA = ['/infrastructure/', '/infra/'];

/** @type {Record<string, string[]>} レイヤーごとの禁止importリスト */
const FORBIDDEN_IMPORTS = {
  '/domain/': ['/usecases/', ...INFRA, '/interfaceAdapter/'],
  '/usecases/': [...INFRA, '/interfaceAdapter/'],
  '/infrastructure/': ['/usecases/', '/interfaceAdapter/'],
  '/infra/': ['/usecases/', '/interfaceAdapter/'],
  '/interfaceAdapter/': [...INFRA],
};

/** @type {Record<string, string>} */
const LAYER_NAMES = {
  '/domain/': 'domain',
  '/usecases/': 'usecases',
  '/infrastructure/': 'infrastructure',
  '/infra/': 'infrastructure',
  '/interfaceAdapter/': 'interfaceAdapter',
};

/**
 * ファイルパスからレイヤーを判定する（フィーチャー配下・shared配下の両方に対応）
 * @param {string} filepath
 * @returns {string | null}
 */
function detectLayer(filepath) {
  for (const layer of Object.keys(FORBIDDEN_IMPORTS)) {
    if (filepath.includes(layer)) {
      return layer;
    }
  }
  return null;
}

/**
 * importパスからレイヤーを判定する（相対importのみ対象）
 * @param {string} importPath
 * @returns {string | null}
 */
function detectImportLayer(importPath) {
  if (!importPath.startsWith('.')) return null;

  for (const layer of Object.keys(LAYER_NAMES)) {
    if (importPath.includes(layer)) {
      return layer;
    }
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
export const layerDependencyRestriction = {
  meta: {
    type: 'problem',
    docs: {
      description: 'レイヤー間の依存方向を制限する（クリーンアーキテクチャ準拠）',
    },
    messages: {
      invalidLayerImport:
        '{{sourceLayer}}層から{{targetLayer}}層へのimportは禁止されています。依存方向: interfaceAdapter → usecases → domain ← infrastructure',
    },
    schema: [],
  },
  create(context) {
    const currentLayer = detectLayer(context.filename);

    if (!currentLayer) return {};

    const forbidden = FORBIDDEN_IMPORTS[currentLayer];
    if (!forbidden || forbidden.length === 0) return {};

    return {
      ImportDeclaration(node) {
        const importPath = String(node.source.value);
        const targetLayer = detectImportLayer(importPath);

        if (targetLayer && forbidden.includes(targetLayer)) {
          context.report({
            messageId: 'invalidLayerImport',
            node,
            data: {
              sourceLayer: LAYER_NAMES[currentLayer] ?? currentLayer,
              targetLayer: LAYER_NAMES[targetLayer] ?? targetLayer,
            },
          });
        }
      },
    };
  },
};
