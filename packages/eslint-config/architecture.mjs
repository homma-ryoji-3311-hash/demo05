/**
 * staff-report アーキテクチャルール
 *
 * フィーチャーファースト + クリーンアーキテクチャ（非DDD）のモノリス向け。
 * マイクロサービス的なサービス間分離の代わりに、フィーチャー間分離を強制する。
 *
 * 使い方:
 *   import { createConfig } from '@staff-report/eslint-config';
 *   import { createArchitectureConfig } from '@staff-report/eslint-config/architecture';
 *   export default [...createConfig(import.meta.dirname), ...createArchitectureConfig()];
 */
import { layerDependencyRestriction } from './rules/layer-dependency-restriction.mjs';
import { noCrossFeatureImport } from './rules/no-cross-feature-import.mjs';
import { noRawErrorThrow } from './rules/no-raw-error-throw.mjs';
import { dependencyDirectionRestriction } from './rules/dependency-direction-restriction.mjs';
import { usecaseNamingConvention } from './rules/usecase-naming-convention.mjs';
import { entityNamingConvention } from './rules/entity-naming-convention.mjs';
import { errorNamingConvention } from './rules/error-naming-convention.mjs';
import { interfaceNamingConvention } from './rules/interface-naming-convention.mjs';
import { noVitestMockInIntegration } from './rules/no-vitest-mock-in-integration.mjs';

const plugin = {
  rules: {
    'layer-dependency-restriction': layerDependencyRestriction,
    'no-cross-feature-import': noCrossFeatureImport,
    'no-raw-error-throw': noRawErrorThrow,
    'dependency-direction-restriction': dependencyDirectionRestriction,
    'usecase-naming-convention': usecaseNamingConvention,
    'entity-naming-convention': entityNamingConvention,
    'error-naming-convention': errorNamingConvention,
    'interface-naming-convention': interfaceNamingConvention,
    'no-vitest-mock-in-integration': noVitestMockInIntegration,
  },
};

export function createArchitectureConfig() {
  return [
    {
      name: 'staff-report-architecture-rules',
      files: ['src/**/*.ts'],
      plugins: {
        architecture: plugin,
      },
      rules: {
        'architecture/layer-dependency-restriction': 'error',
        'architecture/no-cross-feature-import': 'error',
        'architecture/dependency-direction-restriction': 'error',
      },
    },
    {
      // 生Error禁止: テストは除外（テスト用の例外送出は許容）
      name: 'staff-report-error-rules',
      files: ['src/**/*.ts'],
      ignores: ['src/**/*.test.ts'],
      plugins: {
        architecture: plugin,
      },
      rules: {
        'architecture/no-raw-error-throw': 'warn',
      },
    },
    {
      name: 'staff-report-usecase-rules',
      files: ['src/**/usecases/**/*.ts'],
      ignores: ['src/**/*.test.ts'],
      plugins: {
        architecture: plugin,
      },
      rules: {
        'architecture/usecase-naming-convention': 'warn',
      },
    },
    {
      // エンティティの命名規約
      name: 'staff-report-entity-naming-rules',
      files: ['src/**/domain/model/**/*.ts'],
      ignores: ['src/**/*.test.ts'],
      plugins: {
        architecture: plugin,
      },
      rules: {
        'architecture/entity-naming-convention': 'warn',
      },
    },
    {
      // domain/interface/ の命名規約
      name: 'staff-report-interface-naming-rules',
      files: ['src/**/domain/interface/**/*.ts'],
      ignores: ['src/**/*.test.ts'],
      plugins: {
        architecture: plugin,
      },
      rules: {
        'architecture/interface-naming-convention': 'warn',
      },
    },
    {
      // ドメインエラーの定義規約
      name: 'staff-report-error-naming-rules',
      files: ['src/**/domain/error/**/*.ts'],
      plugins: {
        architecture: plugin,
      },
      rules: {
        'architecture/error-naming-convention': 'warn',
      },
    },
    {
      // Integration Test: __tests__/integration/ 配下 または *.integration.test.ts
      name: 'staff-report-integration-test-rules',
      files: ['src/**/__tests__/integration/**/*.test.ts', 'src/**/*.integration.test.ts'],
      plugins: {
        architecture: plugin,
      },
      rules: {
        'architecture/no-vitest-mock-in-integration': 'error',
      },
    },
    {
      // domain層: フレームワーク・技術的関心事のimport禁止
      name: 'staff-report-domain-protection',
      files: ['src/**/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'express', message: 'domainはHTTPを知ってはいけません。interfaceAdapterで扱ってください。' },
              { name: 'zod', message: '境界のバリデーションはinterfaceAdapterで行ってください。' },
            ],
          },
        ],
      },
    },
    {
      // usecases層: HTTPの関心事のimport禁止
      name: 'staff-report-usecases-protection',
      files: ['src/**/usecases/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'express', message: 'usecasesはHTTPを知ってはいけません。interfaceAdapterで扱ってください。' },
            ],
          },
        ],
      },
    },
  ];
}
