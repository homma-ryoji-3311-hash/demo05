import { createConfig } from '@staff-report/eslint-config';
import { createBackendArchitectureConfig } from '@staff-report/eslint-config/architecture-backend';

export default [
  { ignores: ['src/generated/'] }, // Prisma生成コードはlint対象外
  ...createConfig(import.meta.dirname),
  ...createBackendArchitectureConfig(),
];
