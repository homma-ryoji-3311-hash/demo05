import { createConfig } from '@staff-report/eslint-config';
import { createArchitectureConfig } from '@staff-report/eslint-config/architecture';

export default [
  { ignores: ['src/generated/'] }, // Prisma生成コードはlint対象外
  ...createConfig(import.meta.dirname),
  ...createArchitectureConfig(),
];
