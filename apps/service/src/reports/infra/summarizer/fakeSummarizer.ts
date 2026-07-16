import type { SummarizerInterface } from '../../domain/interface/summarizer.js';
import type { StructuredSummary } from '../../domain/model/report.js';
import { SummarizerUnavailableError } from '../../domain/error/reportErrors.js';

/**
 * 決定的フェイク実装（テストダブル）。SummarizerInterface を満たす本物の実装で、
 * 実プロバイダ・実キーを dev/CI に持ち込まずに要約フローを検証できる（仕様表 slice-02「合成フィクスチャ」）。
 * 実プロバイダ実装は同じ infra/summarizer/ に別ファイルで足し、app.ts で差し替える。
 *
 * AC-3（本文にない数値・事実を創作しない）は**抽出のみ**で構造的に守る:
 * 出力はすべて rawText に現れた文字列そのもの。生成・言い換え・補完を一切しないので、
 * 本文に数値が無ければ出力にも数値は現れない。該当が無いカテゴリは空配列のまま返す。
 */

/** 失敗注入の番兵。Summarizer 失敗（→ 502・AC-4）を決定的に再現するために本文で指定する。 */
const FAILURE_SENTINEL = '__FAIL__';

/** 文をカテゴリへ振り分けるキーワード。上から順に評価し、最初に当たったカテゴリへ入れる。 */
const SENTENCE_RULES: ReadonlyArray<{
  category: 'incidents' | 'issues' | 'achievements';
  keywords: readonly string[];
}> = [
  { category: 'incidents', keywords: ['障害', 'インシデント', '不具合', 'エラー', '事故', '停止', 'トラブル'] },
  { category: 'issues', keywords: ['課題', '問題', '懸念', '未解決', '要検討', '積み残し'] },
  { category: 'achievements', keywords: ['完了', '実施', '対応', '修正', '改修', '作成', 'デプロイ', 'リリース'] },
];

/** スキルとして抽出する語彙。本文に literal で現れた語だけを返す（創作しない）。 */
const SKILL_TERMS: readonly string[] = [
  'フロントエンド',
  'バックエンド',
  'インフラ',
  'ダッシュボード',
  'テスト',
  'レビュー',
  '設計',
  'デプロイ',
  'リファクタリング',
  'ドキュメント',
];

/** 本文を文へ分割する（句点・改行区切り）。空文は捨てる。 */
function splitSentences(rawText: string): string[] {
  return rawText
    .split(/[。\r\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export class FakeSummarizer implements SummarizerInterface {
  async summarize(rawText: string): Promise<StructuredSummary> {
    if (rawText.includes(FAILURE_SENTINEL)) {
      // 外部依存の失敗を模す。use-case が SummarizerFailedError へ変換し 502 を返す（AC-4）。
      throw new SummarizerUnavailableError('fake summarizer: failure sentinel found in raw_text');
    }

    const summary: StructuredSummary = { incidents: [], achievements: [], issues: [], skills: [] };
    for (const sentence of splitSentences(rawText)) {
      const rule = SENTENCE_RULES.find((r) => r.keywords.some((k) => sentence.includes(k)));
      if (rule) summary[rule.category].push(sentence);
    }
    summary.skills = SKILL_TERMS.filter((term) => rawText.includes(term));
    return summary;
  }
}
