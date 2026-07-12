import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

/**
 * staff-report 共通 ESLint 設定（Flat Config）
 *
 * 使い方:
 *   import { createConfig } from '@staff-report/eslint-config';
 *   export default createConfig(import.meta.dirname);
 */
/** @param {string} projectDir */
export function createConfig(projectDir) {
  return tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
      ignores: ['dist/', 'node_modules/', 'coverage/', '*.js', '*.mjs'],
    },
    {
      files: ['src/**/*.{ts,tsx}'],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: projectDir,
        },
      },
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  );
}
