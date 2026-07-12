import { createConfig } from '@staff-report/eslint-config';
import { createFrontendArchitectureConfig } from '@staff-report/eslint-config/architecture-frontend';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  ...createConfig(import.meta.dirname),
  ...createFrontendArchitectureConfig(),
  reactHooks.configs['recommended-latest'],
  reactRefresh.configs.vite,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
];
