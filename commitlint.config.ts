import type { UserConfig } from '@commitlint/types';

// subject に日本語（ひらがな / カタカナ / 漢字）が 1 文字以上含まれるかを検証する。
// 英語の技術用語・識別子の混在は許容し、説明が日本語で書かれていることだけを担保する。
const JAPANESE_PATTERN = /[぀-ゟ゠-ヿ々㐀-鿿ｦ-ﾝー〜]/;

// subject 末尾の Jira 課題キー [SRP-<番号>] を検証するパターン。
// PR タイトルでのみ必須（commitlint.pr.config.ts）。
const JIRA_KEY_PATTERN = /\[SRP-\d+\]$/;

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-japanese': ({ subject }) => [
          JAPANESE_PATTERN.test(subject ?? ''),
          'subject には日本語（ひらがな・カタカナ・漢字）を含めてください',
        ],
        'subject-jira-key': ({ subject }) => [
          JIRA_KEY_PATTERN.test(subject ?? ''),
          'subject の末尾に Jira 課題キーを [SRP-<番号>] の形で付けてください（例: greeting 画面を追加 [SRP-2]）',
        ],
      },
    },
  ],
  rules: {
    'subject-japanese': [2, 'always'],
    // Jira 課題キーはPR タイトルのみ必須（commitlint.pr.config.ts で有効化）
    'subject-jira-key': [0],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    // スコープは web / service / project のいずれかを必須にする
    'scope-enum': [2, 'always', ['web', 'service', 'project']],
    'scope-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
    // 日本語 subject では大文字小文字の概念がなく、ESLint / OpenAPI など英語の
    // 技術用語が先頭に来ると config-conventional の subject-case で誤検知するため無効化する
    'subject-case': [0],
  },
};

export default config;
