/**
 * staff-report フロントエンド（apps/web）向けアーキテクチャルール
 *
 * バックエンドの DDD レイヤールールは適用せず、フィーチャー間分離のみ強制する。
 * - features/A → features/B の直接 import 禁止（共有は shared/ 経由）
 * - shared → feature の import 禁止（shared はフィーチャーに依存しない）
 *
 * 使い方:
 *   import { createFrontendArchitectureConfig } from '@staff-report/eslint-config/architecture-frontend';
 *   export default [...createConfig(import.meta.dirname), ...createFrontendArchitectureConfig()];
 */
import { noCrossFeatureImport } from './rules/no-cross-feature-import.mjs';

const plugin = {
  rules: {
    'no-cross-feature-import': noCrossFeatureImport,
  },
};

export function createFrontendArchitectureConfig() {
  return [
    {
      name: 'staff-report-web-architecture-rules',
      files: ['src/**/*.{ts,tsx}'],
      plugins: {
        architecture: plugin,
      },
      rules: {
        'architecture/no-cross-feature-import': 'error',
      },
    },
  ];
}
