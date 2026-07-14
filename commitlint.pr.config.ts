import type { UserConfig } from '@commitlint/types';

import base from './commitlint.config';

// PR タイトル専用の commitlint 設定。
// squash マージ時に PR タイトルがコミットメッセージになるため、ここでのみ
// Jira 課題キー [SRP-<番号>] を必須にする（個々のコミットでは任意）。
const config: UserConfig = {
  ...base,
  rules: {
    ...base.rules,
    'subject-jira-key': [2, 'always'],
  },
};

export default config;
