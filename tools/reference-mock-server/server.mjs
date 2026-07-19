// 実行可能な reference-mock（answer key の振る舞いオラクル）— Phase 1（slice-01〜07）スコープ。
//
// なぜ reference-mock/ の外にあるか（PM 承認・2026-07-15）:
//   vendor した reference-mock/（answer key の文書）は ADR-0005 どおり read-only のまま保つ。
//   実行オラクルはそれとは別の authored artifact なので、保護外の tools/ に置く。
//   「reference-mock＝文書ベース read-only」とする ADR-0005/0018 を、PM 承認のもと
//   「文書は read-only＋実行オラクルは authored」へ改訂する（根拠は docs/memory-bank/pending-*、
//   docs/adr/ への確定は人が行う）。
//
// 依存ゼロ（Node 組み込み http のみ）。acceptance は ACCEPTANCE_BASE_URL でここへ接続する。
// 実装の正本は docs/spec/slice-01..07.md（approved）と reference-mock/spec.md・phase1-plan.md。
//
// 認証フェイク seam（PM決定: 外部プロバイダは決定的フェイク）:
//   protected route は `X-User-Id` ヘッダを認証済みユーザーとして読む。空/無しは未認証 → 401。
//   受け入れテストは fixture user（staff01）を既定ヘッダで送る（slice-01〜05 は認証済み前提・レジストリ方針）。
//   slice-06 のみヘッダを外して 401、別ユーザーの報告で 403 を検証する。

import { createServer } from 'node:http';

const ALLOWED_DOMAIN = 'example.test';

/** @type {Map<string, any>} reports */
const reports = new Map();
/** @type {Map<string, any>} users */
const users = new Map([
  // slice-13: timezone を持つ（通知の保存 UTC・表示/判定ローカルの基準・spec.md §3.8）。
  ['staff01', { id: 'staff01', email: 'staff01@example.test', name: 'テスト太郎', role: 'staff', timezone: 'Asia/Tokyo' }],
  ['staff02', { id: 'staff02', email: 'staff02@example.test', name: 'テスト花子', role: 'staff', timezone: 'Asia/Tokyo' }],
  // slice-10: テンプレート管理は manager 権限。合成グループの管理者（下流 backend は同一 seed を持つこと）。
  ['mgr01', { id: 'mgr01', email: 'mgr01@example.test', name: '管理花子', role: 'manager', group_id: 'grp_synth_eng', timezone: 'Asia/Tokyo' }],
  // slice-14: 複数グループ(G1/G3)を担当する管理者。担当外(G2)は一覧に出さない（AC-2）。groups は配列（mgr01 の group_id とは別系統）。
  ['admin01', { id: 'admin01', email: 'admin01@example.test', name: '管理太郎', role: 'manager', groups: ['G1', 'G3'] }],
  // slice-17: 承認主体＝super admin（PM 決定 2026-07-15）。承認待ちの新規スタッフは deny-by-default（status=pending）。
  ['super01', { id: 'super01', email: 'super01@example.test', name: '統括管理', role: 'super_admin' }],
  ['pend_ac1', { id: 'pend_ac1', email: 'newstaff1@example.test', name: '新人一', role: 'staff', status: 'pending' }],
  ['pend_ac2', { id: 'pend_ac2', email: 'newstaff2@example.test', name: '新人二', role: 'staff', status: 'pending' }],
  ['pend_ac3', { id: 'pend_ac3', email: 'newstaff3@example.test', name: '新人三', role: 'staff', status: 'pending' }],
  // slice-20: 雑感の閲覧最小ロール検証用。care01=メンタルケア担当・mgr_other=担当外 manager（雑感を見られない）。
  ['care01', { id: 'care01', email: 'care01@example.test', name: 'ケア担当', role: 'mental_care' }],
  ['mgr_other', { id: 'mgr_other', email: 'mgrother@example.test', name: '別管理', role: 'manager', group_id: 'grp_other' }],
  // slice-21: 一括生成の担当 manager（複数グループ grp_engineer/grp_sales を担当）。
  ['bulk_mgr', { id: 'bulk_mgr', email: 'bulkmgr@example.test', name: '一括管理', role: 'manager', groups: ['grp_engineer', 'grp_sales'] }],
  // slice-22: グループ設定の編集担当 manager（grp_a・grp_c を担当。grp_b や mgr01 は非担当＝編集 403）。
  ['gs_mgr', { id: 'gs_mgr', email: 'gsmgr@example.test', name: '設定管理', role: 'manager', groups: ['grp_a', 'grp_c'] }],
]);
let seq = 0;
const nextId = () => `r_${String(++seq).padStart(4, '0')}`;

// slice-03/05 検証用: staff01 の確定済み報告をシード（確定後不変・前回参照の対象）
reports.set('r_seed_confirmed', {
  id: 'r_seed_confirmed',
  user_id: 'staff01',
  report_date: '2026-07-13',
  raw_text: '前々日はテスト整備を実施。',
  status: 'confirmed',
  ai_summary_json: { incidents: [], achievements: ['テスト整備'], issues: [], skills: [] },
  confirmed_summary: { incidents: [], achievements: ['テスト整備'], issues: [], skills: [] },
});
// slice-04/06 検証用: staff02 が所有する報告（他人 → 403）
reports.set('r_other', {
  id: 'r_other',
  user_id: 'staff02',
  report_date: '2026-07-14',
  raw_text: '他スタッフの報告。',
  status: 'confirmed',
  ai_summary_json: { incidents: [], achievements: [], issues: [], skills: [] },
  confirmed_summary: { incidents: [], achievements: [], issues: [], skills: [] },
});

// slice-08 検証用: 合成マスター元データ（消費者 seam の入力。突合=slice-11/12 は後続で実データを埋める）。
// AC-2 のため数値を含めない（数値創作なしの検証源）。
const masters = new Map([
  [
    'staff01',
    {
      staff_name: 'テスト太郎',
      summary_json: { achievements: ['ダッシュボードの改修を担当'], skills: ['フロントエンド'], issues: [] },
    },
  ],
]);
// slice-08: 生成済みスキルシート（再生成で新 id・旧は残す＝非破壊）。履歴一覧の観測は slice-09。
const sheets = new Map();
let sheetSeq = 0;
const nextSheetId = () => `sk_${String(++sheetSeq).padStart(4, '0')}`;

// slice-09 検証用シード（閲覧・履歴・DL・プレビューの対象）。合成データのみ（憲法 §1-6）。
// backend 実装（slice-09 下流）はこの seed を同一に持つこと（reports の r_seed_* / r_other と同型・parity）。
const seedSheet = (s) => sheets.set(s.id, s);
// staff01 の生成済み2版（履歴・生成日時の新しい順の観測源）。
seedSheet({
  id: 'sk_seed_v1',
  staff_id: 'staff01',
  filename: 'テスト太郎_スキルシート_20260710.xlsx',
  file_url: 'https://synthetic-storage.test/skill-sheets/sk_seed_v1?sig=synthetic',
  created_at: '2026-07-10T09:00:00Z',
  content: { career_summary: ['ダッシュボードの改修を担当（職務経歴）'], skills: ['フロントエンド'], issues: [] },
});
seedSheet({
  id: 'sk_seed_v2',
  staff_id: 'staff01',
  filename: 'テスト太郎_スキルシート_20260715.xlsx',
  file_url: 'https://synthetic-storage.test/skill-sheets/sk_seed_v2?sig=synthetic',
  created_at: '2026-07-15T09:00:00Z', // v1 より新しい＝一覧の先頭
  content: { career_summary: ['ダッシュボードの改修を担当（職務経歴）'], skills: ['フロントエンド', 'テスト設計'], issues: [] },
});
// staff02（他人）のシート（AC-3 の 403 検証用・reports の r_other と同型）。
seedSheet({
  id: 'sk_other',
  staff_id: 'staff02',
  filename: 'テスト花子_スキルシート_20260714.xlsx',
  file_url: 'https://synthetic-storage.test/skill-sheets/sk_other?sig=synthetic',
  created_at: '2026-07-14T09:00:00Z',
  content: { career_summary: ['他スタッフの職務経歴'], skills: [], issues: [] },
});

// slice-09: 生成済みシート content を HTML プレビューへ変換（PM決定=HTML・元 xlsx は渡さない）。
const renderPreviewHtml = (s) => {
  const li = (arr) => arr.map((x) => `<li>${x}</li>`).join('');
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${s.filename}</title>` +
    `<section><h1>${s.filename}</h1>` +
    `<h2>職務経歴</h2><ul>${li(s.content.career_summary ?? [])}</ul>` +
    `<h2>スキル</h2><ul>${li(s.content.skills ?? [])}</ul></section></html>`;
};

const PORT = Number(process.env.PORT ?? 8000);
const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? {}));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve(null);
      }
    });
  });
const authUser = (req) => (req.headers['x-user-id'] || '').toString().trim();

// 決定的な要約（数値・事実を創作しない: 入力に無い数字は足さない）
const summarize = (raw) => {
  const text = (raw ?? '').trim();
  return {
    incidents: [],
    achievements: text ? [`要約: ${text.slice(0, 24)}`] : [],
    issues: [],
    skills: /ダッシュボード|フロント|改修/.test(text) ? ['フロントエンド'] : [],
  };
};

// slice-08 AI言い換え（決定的フェイク）: マスターを固定スキーマ（アンカー対応）へ言い換える。
// 数値・事実は創作しない＝抽出/言い換えのみ（入力に数値が無ければ出力にも無い・AC-2）。
const paraphraseSkillsheet = (m) => ({
  career_summary: (m.summary_json.achievements ?? []).map((a) => `${a}（職務経歴）`),
  skills: [...(m.summary_json.skills ?? [])],
  issues: [...(m.summary_json.issues ?? [])],
});
const yyyymmdd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

// slice-10: Excel テンプレート（版・履歴・有効版・アンカー検証）。テンプレート管理は manager 権限。
const templates = new Map();
let tmplSeq = 0;
const nextTmplId = () => `tpl_${String(++tmplSeq).padStart(4, '0')}`;
const isManager = (uid) => users.get(uid)?.role === 'manager';
// 差し込み位置アンカーの必須キー（欠落は 422・AC-2）。
const REQUIRED_ANCHORS = ['name', 'project_block'];
const validateAnchors = (anchorMap) =>
  REQUIRED_ANCHORS.filter((a) => !anchorMap || typeof anchorMap[a] !== 'string' || anchorMap[a].length === 0);
// slice-10 検証用 seed: grp_synth_eng の2版（履歴・有効版切替の観測源）。下流 backend は同一 seed を持つこと。
const seedTemplate = (t) => templates.set(t.id, t);
seedTemplate({
  id: 'tpl_seed_v1',
  group_id: 'grp_synth_eng',
  version: 'v1',
  anchor_map: { name: 'B2', project_block: 'A10:F14' },
  file_url: 'https://synthetic-storage.test/templates/tpl_seed_v1?sig=synthetic',
  is_active: false,
  uploaded_by: 'mgr01',
  created_at: '2026-07-10T09:00:00Z',
});
seedTemplate({
  id: 'tpl_seed_v2',
  group_id: 'grp_synth_eng',
  version: 'v2',
  anchor_map: { name: 'B2', project_block: 'A10:F14' },
  file_url: 'https://synthetic-storage.test/templates/tpl_seed_v2?sig=synthetic',
  is_active: true, // 現在の有効版
  uploaded_by: 'mgr01',
  created_at: '2026-07-15T09:00:00Z',
});

// slice-11: 案件マスター（突合キー）・報告紐づけ・インシデント状態。合成のみ（後段 slice-12 突合の土台）。
const projects = new Map(); // id -> { id, user_id, project_key, client_name, status }
let projSeq = 0;
const nextProjectId = () => `p_${String(++projSeq).padStart(4, '0')}`;
const INCIDENT_STATUSES = ['発生', '対応中', '解決'];
// slice-11 検証用 seed: staff01 の既存案件（AC-1「既存案件へ紐づけ」の対象）。下流 backend は同一 seed を持つこと。
projects.set('p_seed', {
  id: 'p_seed',
  user_id: 'staff01',
  project_key: 'PJ-SEED-001',
  client_name: '得意先シード',
  status: '発生',
});
// 同一ユーザー内で案件キー既存なら既存 PROJECT、未知なら新規作成（AC-3・重複作成しない）。
const resolveProject = (userId, projectKey, clientName) => {
  for (const p of projects.values()) {
    if (p.user_id === userId && p.project_key === projectKey) return p;
  }
  const p = { id: nextProjectId(), user_id: userId, project_key: projectKey, client_name: clientName ?? null, status: '発生' };
  projects.set(p.id, p);
  return p;
};

// slice-12: 突合済みマスター元データ（MASTER_SUMMARIES）。案件×期間で upsert・状態は incident key で最新に上書き。
// 生報告ログ（reports）は不変で、更新はこの別レイヤーにのみ起きる（§3.4・AC-3）。合成のみ。
const masterSummaries = new Map(); // `${user_id}|${project_id}|${period}` -> { user_id, project_id, period, summary, reconciled_at }
const periodOf = (reportDate) => String(reportDate ?? '').slice(0, 7); // report_date の YYYY-MM（AC 契約 Q3）

// slice-14: 管理者コンソール用の合成スタッフ台帳（グループ単位の担当・表示列）。可視範囲はバックエンドで強制（AC-2）。
// 報告状況は §3.9 の二値（reported / not_reported）まで。5 ステータスは slice-15、操作の実挙動は slice-09/21。
const managerGroups = (uid) => { const u = users.get(uid); return u?.groups ?? (u?.group_id ? [u.group_id] : []); };
const adminStaff = [
  { id: 's_g1_a', name: 'テスト 太郎', group_id: 'G1', client_name: 'クライアントA', last_report_at: '2026-07-14T09:00:00Z', report_status: 'reported', has_latest_sheet: true },
  { id: 's_g1_b', name: 'テスト 花子', group_id: 'G1', client_name: 'クライアントB', last_report_at: null, report_status: 'not_reported', has_latest_sheet: false },
  { id: 's_g3_a', name: 'テスト 次郎', group_id: 'G3', client_name: 'クライアントC', last_report_at: '2026-07-13T08:00:00Z', report_status: 'reported', has_latest_sheet: false },
  { id: 's_g2_a', name: 'テスト 三郎', group_id: 'G2', client_name: 'クライアントD', last_report_at: '2026-07-12T07:00:00Z', report_status: 'reported', has_latest_sheet: true }, // 担当外 G2（G1/G3 管理者には出さない・AC-2）
];
const adminStaffView = (s) => ({
  id: s.id, name: s.name, group_id: s.group_id, client_name: s.client_name,
  last_report_at: s.last_report_at, report_status: s.report_status, has_latest_sheet: s.has_latest_sheet,
});

// slice-15: 報告サイクル・締切・報告ステータス（5種）の判定セマンティクスを固定（phase2-design §6）。
// 注意: REST パス・エンティティ・スケジュール生成の詳細は phase2-design §7 の実装時詳細設計。ここの URL は
// 「セマンティクス fixture」で、テストは状態遷移を pin する（URL 形状に依存しすぎない）。固定時刻型の締切のみ対象。
const REPORT_CYCLES = ['daily', 'weekly', 'biweekly', 'monthly'];
const reportCycles = new Map(); // staff_id -> { staff_id, cycle, deadline_local }
// 機会（報告義務の単位）。5 ステータスは confirmed_at/deadline_utc・flagged_missing・absence_approved の純関数。
// 並列干渉回避: 読み取り専用機会（sub/late/missing）と mutate 用機会（flag/absent 各テスト専用）を分ける。
const opportunities = new Map();
const seedOpp = (o) => opportunities.set(o.id, { eligible: true, confirmed_at: null, flagged_missing: false, absence_approved: false, ...o });
seedOpp({ id: 'opp_sub', staff_id: 'staff01', date: '2026-07-14', deadline_utc: '2026-07-14T09:00:00Z', confirmed_at: '2026-07-14T08:30:00Z' }); // 締切前確定→submitted
seedOpp({ id: 'opp_late', staff_id: 'staff01', date: '2026-07-13', deadline_utc: '2026-07-13T09:00:00Z', confirmed_at: '2026-07-13T10:00:00Z' }); // 締切後確定→late
seedOpp({ id: 'opp_missing', staff_id: 'staff01', date: '2026-07-12', deadline_utc: '2026-07-12T09:00:00Z' }); // 未確定→missing(中立)
seedOpp({ id: 'opp_flag', staff_id: 'staff01', date: '2026-07-11', deadline_utc: '2026-07-11T09:00:00Z' }); // AC-4 専用: 管理者が計上→報告漏れ
seedOpp({ id: 'opp_absent', staff_id: 'staff01', date: '2026-07-10', deadline_utc: '2026-07-10T09:00:00Z' }); // AC-5 専用: 申告+承認→欠勤
// 5 ステータスの純関数判定（phase2-design §6.4）。優先: 欠勤>報告漏れ>提出/遅延>未報告。
const opportunityStatus = (o) => {
  if (o.absence_approved) return 'absent'; // 欠勤（申告+管理者承認・AC-5）評価対象外
  if (o.flagged_missing) return 'unreported_flagged'; // 報告漏れ（管理者が実態確認の上で計上・AC-4）評価に効く
  if (o.confirmed_at) return o.confirmed_at <= o.deadline_utc ? 'submitted' : 'late'; // 締切前=提出済み / 後=遅延提出（AC-2）
  return 'missing'; // 締切超過・未確定＝未報告（自動検知の中立・AC-3）評価に効かない
};
const opportunityView = (o) => ({ id: o.id, staff_id: o.staff_id, date: o.date, deadline_utc: o.deadline_utc, status: opportunityStatus(o) });

// slice-16: Slack リマインド（短間隔ジョブによる抽出送信）。外部送信は決定的フェイク notifier に差し替え（PM 決定 2026-07-15）。
// 実 Slack/メールへは送らず、「誰に・どのチャネルで送ったか」を sink として返す。ジョブは run_at(UTC) を受けて対象を抽出する
// （実スケジューラ・通知抽象化層は downstream。ここの URL は semantics fixture）。判定はローカル時刻・保存 UTC。
// TZ ヘルパは slice-13 の tzOffsetMin と別名で自己完結（両者マージ時も再宣言衝突を起こさない）。
const remindTzOffsetMin = (tz) => {
  const at = new Date('2026-07-15T00:00:00Z');
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).reduce((a, x) => ((a[x.type] = x.value), a), {});
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at.getTime()) / 60000);
};
const localToUtcHHMM = (hhmm, tz) => {
  const [h, mm] = hhmm.split(':').map(Number);
  const t = (((h * 60 + mm) - remindTzOffsetMin(tz)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
// 合成のリマインド対象（slice-13 通知設定＋slice-15 提出状況を内包した抽出源。実データ・秘密は入れない）。
const reminderUsers = [
  { id: 'ru_tokyo', timezone: 'Asia/Tokyo', remind_local: '18:00', slack_enabled: true, email_enabled: false, submitted: false }, // 18:00 JST → 09:00Z
  { id: 'ru_sg', timezone: 'Asia/Singapore', remind_local: '18:00', slack_enabled: true, email_enabled: true, submitted: false }, // 同ローカル18:00・別TZ → 10:00Z（AC-2）
  { id: 'ru_done', timezone: 'Asia/Tokyo', remind_local: '18:00', slack_enabled: true, email_enabled: false, submitted: true }, // 提出済み → 対象外（AC-4）
  { id: 'ru_noslack', timezone: 'Asia/Tokyo', remind_local: '18:00', slack_enabled: false, email_enabled: false, submitted: false }, // Slack OFF → badge のみ（AC-3）
];
const reminderChannels = (u) => ['badge', ...(u.slack_enabled ? ['slack'] : []), ...(u.email_enabled ? ['email'] : [])]; // まずバッジ→設定に従い Slack/メール

// slice-17: 承認待ち／承認・担当紐付け。新規スタッフは deny-by-default（pending）→ 承認で active。承認主体は super admin。
// 主/副担当の操作差の細部・system/super admin の分離は slice-24 permission-model へ（本スライスは属性の設定までを対象）。
const ASSIGNMENT_ROLES = ['primary', 'secondary'];
const isSuperAdmin = (uid) => users.get(uid)?.role === 'super_admin';
const isPending = (uid) => users.get(uid)?.status === 'pending';

// slice-19: 設問テンプレート編集（グループ単位・順序付き・回答形式/必須/役割タグ・公開ガードレール・版管理）。manager。
const QUESTION_FORMATS = ['short', 'long', 'select'];
const ROLE_TAGS = ['project_key', 'status', 'skill', 'internal_only'];
const REQUIRED_PUBLISH_ROLES = ['project_key', 'skill']; // 公開ガードレール: 各役割 ≥1（不足は公開拒否・AC-3）
const questionSets = new Map(); // id -> { id, group_id, version|null, status:'draft'|'published', questions:[{order,format,required,role_tag,text}] }
let qsSeq = 0;
const nextQsId = () => `qs_${String(++qsSeq).padStart(4, '0')}`;
const maxPublishedVersion = (groupId) =>
  [...questionSets.values()].filter((q) => q.group_id === groupId && q.status === 'published').reduce((mx, q) => Math.max(mx, q.version ?? 0), 0);
// 設問の正規化＋検証（不正な形式/役割タグは 422）。order は配列位置で採番（並べ替えは配列順で表現）。
const normalizeQuestions = (arr) => {
  if (!Array.isArray(arr)) return null;
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const q = arr[i];
    if (!QUESTION_FORMATS.includes(q?.format) || !ROLE_TAGS.includes(q?.role_tag)) return null;
    out.push({ order: i + 1, format: q.format, required: q.required === true, role_tag: q.role_tag, text: typeof q.text === 'string' ? q.text : '' });
  }
  return out;
};
const missingPublishRoles = (questions) => REQUIRED_PUBLISH_ROLES.filter((r) => !questions.some((q) => q.role_tag === r));
// seed: published v1（過去報告が参照する不変版・AC-4）。
questionSets.set('qs_seed_v1', {
  id: 'qs_seed_v1', group_id: 'grp_engineer', version: 1, status: 'published',
  questions: [
    { order: 1, format: 'short', required: true, role_tag: 'project_key', text: '案件キー' },
    { order: 2, format: 'long', required: true, role_tag: 'skill', text: '使ったスキル' },
  ],
});

// slice-20: ソフト設問・ウェルビーイング。雑感(zakkan)は AI 変換・シート反映から完全除外・閲覧限定・スコア化禁止。
// 閲覧の最小ロール: 本人・担当 manager・メンタルケア担当（主/副の区別は slice-24）。雑感は任意入力・本人非公開可。
const assignedManagers = new Map([['staff01', ['mgr01']]]); // staff -> 担当 manager（合成・最小ロール。mgr_other は非担当）
const isAssignedManager = (viewerId, staffId) => (assignedManagers.get(staffId) ?? []).includes(viewerId);
// ソフト設問を要約へ反映する（AI活用→スキル／課題・所感→内部・非反映／雑感→Summarizer へ一切渡さない・AC-1/AC-2）。
// 雑感は本関数の入力に含めない（＝AI 変換対象外）。スコア・診断・点数は一切生成しない（AC-4）。
const applySoftAnswersToSummary = (base, soft) => {
  if (!soft) return base;
  const skills = [...base.skills];
  if (typeof soft.ai_use === 'string' && soft.ai_use.length) skills.push(`AI活用: ${soft.ai_use}`); // AI活用はスキルへ反映
  return { ...base, skills }; // 課題(issue)・所感(shokan)は内部・非反映／雑感(zakkan)は参照しない
};

// slice-21: 一括ダウンロード（全員分生成・ZIP・客先/部署/グループ絞り込み・未生成はスキップ＋manifest）。manager。
// ZIP は semantics fixture（entries/skipped/manifest の構造で表現。実 ZIP バイナリ生成は downstream 詳細設計）。
const bulkMgrGroups = (uid) => { const u = users.get(uid); return u?.groups ?? (u?.group_id ? [u.group_id] : []); };
const bulkStaff = [
  { id: 'bs_1', name: 'テスト 太郎', client: 'A社', dept: '開発部', group_id: 'grp_engineer', has_master: true },
  { id: 'bs_2', name: 'テスト 花子', client: 'B社', dept: '開発部', group_id: 'grp_engineer', has_master: true },
  { id: 'bs_3', name: 'テスト 次郎', client: 'A社', dept: '営業部', group_id: 'grp_sales', has_master: false }, // マスター未生成→スキップ（AC-5）
];
// 出力ファイル名を機械的に付与（[スタッフ名]_[ファイル名]_YYYYMMDD.xlsx・AC-4）。日付は出力日。
const bulkFilename = (name) => `${name}_スキルシート_${yyyymmdd(process.env.SKILLSHEET_NOW ? new Date(process.env.SKILLSHEET_NOW) : new Date())}.xlsx`;

// slice-22: グループ別設定（設定駆動）。グループ固有部分（設問セット版・様式・タブ）を設定データで切替。翌日反映・過去不変・移管履歴。
// 担当範囲の正確な解決（権限3軸）は slice-24 へ。ここは spec.md §1.3・§6.2「グループ単位・バックエンド強制」まで。
const groupSettings = new Map(); // group_id -> { group_id, question_set_version, template_style, tab_label, effective_from }
const setGroupSetting = (g) => groupSettings.set(g.group_id, g);
setGroupSetting({ group_id: 'grp_a', question_set_version: 'v2', template_style: 'style_default', tab_label: '開発', effective_from: '2026-07-01' });
setGroupSetting({ group_id: 'grp_b', question_set_version: 'v1', template_style: 'style_marketer', tab_label: 'マーケ', effective_from: '2026-07-01' });
const groupManagers = new Map([['grp_a', ['gs_mgr']], ['grp_b', []], ['grp_c', ['gs_mgr']]]); // 編集担当（AC-4）
const isGroupManager = (uid, groupId) => (groupManagers.get(groupId) ?? []).includes(uid);
const nextBusinessDay = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }; // 翌日（営業日計算の詳細は downstream）
// AC-3/AC-5: 過去の確定報告は作成時点の group/設定を保持（不変履歴）。移管しても過去は元グループのまま。
const reportSnapshots = new Map(); // report_id -> { report_id, staff_id, group_id, applied_settings }
reportSnapshots.set('rs_past', { report_id: 'rs_past', staff_id: 'gs_staff', group_id: 'grp_a', applied_settings: { question_set_version: 'v2', template_style: 'style_default' } });
const staffCurrentGroup = new Map([['gs_staff', 'grp_a']]); // 現在の所属（移管で変わるが過去報告の group_id は不変・AC-5）

// slice-23: AI 追加質問。要約後に薄い項目（ルール検出＝決定的）へ一度だけ追加質問。回答は本文へ追記→要約作り直し。
// 【決定】のみ AC 化（しきい値・優先順位・データモデル等の精緻化は slice-26 へ段階送り）。degrade は必須ブロックを発動しない。
const FOLLOWUP_TARGET_CATEGORIES = ['issues']; // 対象カテゴリの仮値（単一基準・slice-26 で精緻化）
const FOLLOWUP_MIN_LEN = 5; // 「薄い」とみなす最小文字数の仮値（ゆるめ・slice-26 で調整）
// ルール検出（決定的）: 対象カテゴリが空 or 全要素が極端に短い → 薄い。Gemini 自動判定は主役にしない。
const isThin = (summary) =>
  FOLLOWUP_TARGET_CATEGORIES.some((c) => {
    const v = summary?.[c];
    return !Array.isArray(v) || v.length === 0 || v.every((x) => String(x ?? '').trim().length < FOLLOWUP_MIN_LEN);
  });

// slice-13: 通知設定（NOTIFICATION_SETTINGS）。設定は user_id に紐づき本人のみ（AC-4・専用パスに :id を持たせない）。
// リマインド時刻は「保存 UTC・表示/判定ローカル」（spec.md §3.8・CLAUDE.md 原則9）。実際の送信は slice-16。
const notificationSettings = new Map(); // user_id -> { remind_time_utc:'HH:MM', slack_enabled, email_enabled }
const DEFAULT_NOTIFICATION = { remind_time_utc: '09:00', slack_enabled: true, email_enabled: false }; // 未設定時の既定（AC-1）。09:00Z は Asia/Tokyo で 18:00
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/; // 24h "HH:MM"。外れは 422（AC-2）
const userTz = (uid) => users.get(uid)?.timezone ?? 'Asia/Tokyo'; // 既定 TZ（合成のみ）
// IANA tz の UTC オフセット（分）。固定参照時刻で決定的に算出（demo: DST 跨ぎの厳密性より決定性を優先。Asia/Tokyo は +540 固定）。
const tzOffsetMin = (tz) => {
  const at = new Date('2026-07-15T00:00:00Z');
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
    .formatToParts(at)
    .reduce((a, x) => ((a[x.type] = x.value), a), {});
  const asLocal = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asLocal - at.getTime()) / 60000);
};
const hhmmToMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const minToHhmm = (min) => { const x = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const localToUtc = (hhmm, tz) => minToHhmm(hhmmToMin(hhmm) - tzOffsetMin(tz)); // 入力ローカル → 保存 UTC
const utcToLocal = (hhmm, tz) => minToHhmm(hhmmToMin(hhmm) + tzOffsetMin(tz)); // 保存 UTC → 表示ローカル
const notificationView = (uid) => {
  const s = notificationSettings.get(uid) ?? DEFAULT_NOTIFICATION;
  const tz = userTz(uid);
  return {
    remind_time: utcToLocal(s.remind_time_utc, tz), // 表示/判定ローカル（AC-3）
    remind_time_utc: s.remind_time_utc, // 保存 UTC（往復検証で下流に UTC 正規化を強制・AC-3）
    slack_enabled: s.slack_enabled,
    email_enabled: s.email_enabled,
    timezone: tz,
  };
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const hit = (method, re) => req.method === method && re.exec(path);
  let m;

  // ---- public ----
  if (hit('GET', /^\/api\/health$/)) return json(res, 200, { status: 'ok' });

  // slice-06 AC-1/AC-2: OAuth コールバック（フェイク）。許可ドメイン外は 403。
  if (hit('GET', /^\/auth\/google\/callback$/)) {
    const email = (url.searchParams.get('email') || '').toLowerCase();
    const domain = email.split('@')[1];
    if (!email || domain !== ALLOWED_DOMAIN) return json(res, 403, { error: 'domain_not_allowed' });
    const id = email.split('@')[0];
    if (!users.has(id)) users.set(id, { id, email, name: id, role: 'staff' }); // upsert
    return json(res, 200, { user: users.get(id), session: 'fake-session-token' });
  }

  // ---- protected: 未認証は 401（slice-06 AC-3） ----
  const uid = authUser(req);
  if (!uid) return json(res, 401, { error: 'unauthenticated' });

  // slice-06: /me（slice-17: 承認状態 status も返す。承認待ち画面が自分の状態を知れるよう pending も /me は許可）
  if (hit('GET', /^\/me$/)) {
    const u = users.get(uid) ?? { id: uid, role: 'staff' };
    return json(res, 200, { id: u.id, role: u.role, name: u.name, status: u.status ?? 'active' });
  }

  // slice-17 AC-1/AC-3: deny-by-default。未承認（pending）は /me 以外の保護 API で 403（報告フローに入れない）。
  // 承認（AC-2）で status=active になるとこのゲートを通過する（AC-3）。既存ユーザーは status 無し＝active 扱いで不変。
  if (isPending(uid)) return json(res, 403, { error: 'pending_approval' });

  // slice-07: ホーム集約
  if (hit('GET', /^\/home$/)) {
    const mine = [...reports.values()].filter((r) => r.user_id === uid);
    const draft = mine.find((r) => r.status === 'draft') ?? null;
    const today_status = draft ? 'draft_exists' : mine.some((r) => r.status === 'confirmed') ? 'confirmed' : 'none';
    return json(res, 200, {
      today_status,
      draft: draft ? { id: draft.id } : null,
      links: { new_report: '/reports/new', drafts: draft ? `/reports/${draft.id}` : null },
    });
  }

  // slice-08: POST /skill-sheets（生成）。任意 staff_id（省略=自分）。他人対象は 403。
  if (hit('POST', /^\/skill-sheets$/)) {
    const body = await readBody(req);
    const target = body && typeof body.staff_id === 'string' && body.staff_id.length > 0 ? body.staff_id : uid;
    if (target !== uid) return json(res, 403, { error: 'forbidden' }); // 他人のマスターは対象にできない（deny-by-default）
    const master = masters.get(uid);
    if (!master) return json(res, 404, { error: 'no_master_data' });
    // データ組立（seed から決定的取得）→ AI言い換え（固定スキーマ・数値創作なし）→ テンプレート反映（省略・メタのみ）
    const content = paraphraseSkillsheet(master);
    const now = process.env.SKILLSHEET_NOW ? new Date(process.env.SKILLSHEET_NOW) : new Date();
    const id = nextSheetId();
    const filename = `${master.staff_name}_スキルシート_${yyyymmdd(now)}.xlsx`;
    const file_url = `https://synthetic-storage.test/skill-sheets/${id}?sig=synthetic`;
    const sheet = { id, staff_id: uid, filename, file_url, created_at: now.toISOString(), content };
    sheets.set(id, sheet); // 再生成は新 id・旧は残す（非破壊）
    return json(res, 201, sheet);
  }

  // slice-09 AC-1/AC-4: GET /skill-sheets（自分の生成済み一覧・生成日時の新しい順・履歴込み）
  if (hit('GET', /^\/skill-sheets$/)) {
    const mine = [...sheets.values()]
      .filter((s) => s.staff_id === uid)
      // created_at 降順。同時刻は id 降順で後発を先頭に（新しい版が先）。
      .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.id < b.id ? 1 : -1));
    return json(res, 200, { sheets: mine });
  }

  // slice-09 AC-2/AC-3/AC-4: GET /skill-sheets/:id/download（元の xlsx を署名付き URL で渡す）。他人 403・無し 404。
  if ((m = hit('GET', /^\/skill-sheets\/([^/]+)\/download$/))) {
    const s = sheets.get(m[1]);
    if (!s) return json(res, 404, { error: 'not_found' });
    if (s.staff_id !== uid) return json(res, 403, { error: 'forbidden' }); // 他人のシートは DL 不可（deny-by-default）
    return json(res, 200, { file_url: s.file_url, filename: s.filename }); // プレビュー変換でなく元の xlsx
  }

  // slice-09 AC-5/AC-3/AC-4: GET /skill-sheets/:id/preview（HTML プレビュー・PM決定）。他人 403・無し 404。元 xlsx は渡さない。
  if ((m = hit('GET', /^\/skill-sheets\/([^/]+)\/preview$/))) {
    const s = sheets.get(m[1]);
    if (!s) return json(res, 404, { error: 'not_found' });
    if (s.staff_id !== uid) return json(res, 403, { error: 'forbidden' });
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(renderPreviewHtml(s));
  }

  // slice-10 AC-1/AC-2/AC-4: POST /templates（アップロード＋アンカー検証）。manager のみ・欠落アンカーは 422。
  if (hit('POST', /^\/templates$/)) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' }); // テンプレート管理は manager（staff→403）
    const body = await readBody(req);
    const anchor_map = (body && body.anchor_map) || {};
    const missing = validateAnchors(anchor_map);
    if (missing.length) return json(res, 422, { error: 'validation_failed', field: 'anchor_map', missing }); // 欠落は有効版に登録しない
    const id = nextTmplId();
    const group_id = users.get(uid).group_id;
    const version = `v${[...templates.values()].filter((t) => t.group_id === group_id).length + 1}`;
    const tmpl = {
      id,
      group_id,
      version,
      anchor_map,
      file_url: `https://synthetic-storage.test/templates/${id}?sig=synthetic`,
      is_active: false,
      uploaded_by: uid,
      created_at: new Date().toISOString(),
    };
    templates.set(id, tmpl);
    return json(res, 201, tmpl);
  }

  // slice-10 AC-3/AC-4: PUT /templates/:id/activate（有効版切替・旧版は履歴として残す）。manager のみ・無し 404。
  if ((m = hit('PUT', /^\/templates\/([^/]+)\/activate$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const t = templates.get(m[1]);
    if (!t) return json(res, 404, { error: 'not_found' });
    for (const other of templates.values()) if (other.group_id === t.group_id) other.is_active = false; // 同一グループ内で有効版を排他に
    t.is_active = true; // 旧版は削除せず is_active=false で残る（履歴）
    return json(res, 200, t);
  }

  // slice-10 AC-3/UI: GET /templates（自グループの版一覧・履歴・有効版フラグ）。manager のみ。
  if (hit('GET', /^\/templates$/)) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const group_id = users.get(uid).group_id;
    const list = [...templates.values()]
      .filter((t) => t.group_id === group_id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.id < b.id ? 1 : -1));
    return json(res, 200, { templates: list });
  }

  // slice-13 AC-1: GET /notification-settings（自分の設定・未設定は既定値・時刻は表示ローカル）
  if (hit('GET', /^\/notification-settings$/)) {
    return json(res, 200, notificationView(uid));
  }

  // slice-13 AC-2/AC-3: PUT /notification-settings（更新）。時刻は保存 UTC へ正規化。不正な時刻形式は 422。
  if (hit('PUT', /^\/notification-settings$/)) {
    const body = await readBody(req);
    if (body === null) return json(res, 422, { error: 'validation_failed' });
    if (typeof body.remind_time !== 'string' || !HHMM.test(body.remind_time)) {
      return json(res, 422, { error: 'validation_failed', field: 'remind_time' }); // 不正時刻は保存しない
    }
    const tz = userTz(uid);
    const prev = notificationSettings.get(uid) ?? DEFAULT_NOTIFICATION;
    notificationSettings.set(uid, {
      remind_time_utc: localToUtc(body.remind_time, tz), // 入力ローカル → 保存 UTC
      slack_enabled: typeof body.slack_enabled === 'boolean' ? body.slack_enabled : prev.slack_enabled,
      email_enabled: typeof body.email_enabled === 'boolean' ? body.email_enabled : prev.email_enabled,
    });
    return json(res, 200, notificationView(uid));
  }

  // slice-14 AC-1/2/3/4: GET /admin/staff（manager 専用・担当グループのスタッフのみ・?group でタブ絞り込み）
  if (hit('GET', /^\/admin\/staff$/)) {
    const u = users.get(uid);
    if (!u || u.role !== 'manager') return json(res, 403, { error: 'forbidden' }); // staff ロールは 403（AC-4）
    const myGroups = managerGroups(uid);
    const requested = url.searchParams.get('group');
    // ?group 指定は担当グループと交差（担当外指定は空・AC-3）。未指定は担当グループ全部（AC-1）。
    const scope = requested ? (myGroups.includes(requested) ? [requested] : []) : myGroups;
    const staff = adminStaff.filter((s) => scope.includes(s.group_id)).map(adminStaffView); // 担当外(G2)はバックエンドで除外（AC-2）
    return json(res, 200, { groups: myGroups, staff });
  }

  // slice-15 AC-1: 管理者がスタッフの報告サイクル（固定時刻型の締切）を設定/取得する。manager 専用・不正サイクルは 422。
  if ((m = hit('PUT', /^\/admin\/report-cycles\/([^/]+)$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const body = await readBody(req);
    if (!body || !REPORT_CYCLES.includes(body.cycle)) return json(res, 422, { error: 'validation_failed', field: 'cycle' });
    const row = { staff_id: m[1], cycle: body.cycle, deadline_local: typeof body.deadline_local === 'string' ? body.deadline_local : '18:00' };
    reportCycles.set(m[1], row);
    return json(res, 200, row);
  }
  if ((m = hit('GET', /^\/admin\/report-cycles\/([^/]+)$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const row = reportCycles.get(m[1]);
    return row ? json(res, 200, row) : json(res, 404, { error: 'not_found' });
  }

  // slice-15 AC-2/3/6: 本人は自分の履行状況（5 ステータス）を read-only で閲覧する。
  if (hit('GET', /^\/me\/report-status$/)) {
    const mine = [...opportunities.values()].filter((o) => o.staff_id === uid && o.eligible).map(opportunityView);
    return json(res, 200, { opportunities: mine });
  }

  // slice-15 AC-4: 管理者が実態確認の上「報告漏れ」を計上（未報告→報告漏れ・人間の確認を一枚）。staff は 403（本人は read-only）。
  if ((m = hit('POST', /^\/admin\/report-status\/([^/]+)\/flag-missing$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' }); // 自動計上でない・本人は不可
    const o = opportunities.get(m[1]);
    if (!o) return json(res, 404, { error: 'not_found' });
    o.flagged_missing = true;
    return json(res, 200, opportunityView(o));
  }

  // slice-15 AC-5: 欠勤はスタッフ申告＋管理者承認で付与（消去でなくステータスとして残す）。manager 専用。
  if ((m = hit('POST', /^\/admin\/report-status\/([^/]+)\/approve-absence$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const o = opportunities.get(m[1]);
    if (!o) return json(res, 404, { error: 'not_found' });
    o.absence_approved = true; // 評価対象外・記録として残る（後から経緯を検証できる）
    return json(res, 200, opportunityView(o));
  }

  // slice-16 AC-1〜4: 短間隔リマインドジョブ。run_at(UTC) に「通知すべきユーザー」を DB から抽出しフェイク notifier へ送る（sink を返す）。
  if (hit('POST', /^\/jobs\/reminder\/run$/)) {
    const body = await readBody(req);
    const runAt = typeof body?.run_at === 'string' ? body.run_at : null;
    if (!runAt) return json(res, 422, { error: 'validation_failed', field: 'run_at' });
    const runHHMM = new Date(runAt).toISOString().slice(11, 16); // 実行時刻の UTC HH:MM
    const notified = reminderUsers
      .filter((u) => !u.submitted) // 提出済み（提出済みステータス）は対象外（AC-4）
      .filter((u) => localToUtcHHMM(u.remind_local, u.timezone) === runHHMM) // ローカル時刻を UTC 換算して一致で抽出（AC-1/AC-2）
      .map((u) => ({ user_id: u.id, channels: reminderChannels(u) })); // まずバッジ＋設定に従い Slack/メール（AC-3）
    return json(res, 200, { run_at: runAt, notified });
  }

  // slice-17 AC-4: 承認待ちスタッフ一覧は super admin のみ取得できる（他ロールには見せない）。
  if (hit('GET', /^\/admin\/staff\/pending$/)) {
    if (!isSuperAdmin(uid)) return json(res, 403, { error: 'forbidden' });
    const pending = [...users.values()]
      .filter((u) => u.status === 'pending')
      .map((u) => ({ id: u.id, email: u.email, name: u.name }));
    return json(res, 200, { pending });
  }

  // slice-17 AC-2: super admin の承認で担当（主/副）・チャネル・報告サイクルを設定し active 化する。
  if ((m = hit('POST', /^\/admin\/staff\/([^/]+)\/approve$/))) {
    if (!isSuperAdmin(uid)) return json(res, 403, { error: 'forbidden' }); // 承認は組織横断の権限＝super admin
    const target = users.get(m[1]);
    if (!target) return json(res, 404, { error: 'not_found' });
    const body = await readBody(req);
    const role = body?.assignment?.role;
    if (!ASSIGNMENT_ROLES.includes(role)) return json(res, 422, { error: 'validation_failed', field: 'assignment.role' });
    target.status = 'active'; // deny-by-default 解除（AC-3）
    target.assignment = { role }; // 主/副の属性設定（操作差の細部は slice-24）
    target.channel = typeof body.channel === 'string' ? body.channel : null;
    target.cycle = typeof body.cycle === 'string' ? body.cycle : null;
    return json(res, 200, { id: target.id, status: target.status, assignment: target.assignment, channel: target.channel, cycle: target.cycle });
  }

  // slice-19 AC-1/AC-2: 設問セットを作成（下書き）。manager 専用。不正な形式/役割タグは 422。
  if (hit('POST', /^\/question-sets$/)) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const body = await readBody(req);
    const questions = normalizeQuestions(body?.questions);
    if (!questions || typeof body.group_id !== 'string') return json(res, 422, { error: 'validation_failed', field: 'questions' });
    const id = nextQsId();
    const qs = { id, group_id: body.group_id, version: null, status: 'draft', questions };
    questionSets.set(id, qs);
    return json(res, 201, qs);
  }
  // slice-19 AC-1: 設問セットを更新（並べ替え含む）。取得時に同じ順序で返る。
  if ((m = hit('PUT', /^\/question-sets\/([^/]+)$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const qs = questionSets.get(m[1]);
    if (!qs) return json(res, 404, { error: 'not_found' });
    const body = await readBody(req);
    const questions = normalizeQuestions(body?.questions);
    if (!questions) return json(res, 422, { error: 'validation_failed', field: 'questions' });
    qs.questions = questions; // 配列順＝並び順（order を再採番）
    return json(res, 200, qs);
  }
  // slice-19: 設問セット取得（順序・形式・必須・役割タグを返す）。
  if ((m = hit('GET', /^\/question-sets\/([^/]+)$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const qs = questionSets.get(m[1]);
    return qs ? json(res, 200, qs) : json(res, 404, { error: 'not_found' });
  }
  // slice-19 AC-3/AC-4: 公開。ガードレール（必須役割不足）で 422・公開状態に遷移しない。通れば版を上げて published（過去版は不変で残す）。
  if ((m = hit('POST', /^\/question-sets\/([^/]+)\/publish$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const qs = questionSets.get(m[1]);
    if (!qs) return json(res, 404, { error: 'not_found' });
    const missing = missingPublishRoles(qs.questions);
    if (missing.length) return json(res, 422, { error: 'guardrail_failed', missing_roles: missing }); // 公開拒否・状態不変
    qs.version = maxPublishedVersion(qs.group_id) + 1; // 版を切る（過去 published 版は別 id で不変・AC-4）
    qs.status = 'published';
    return json(res, 200, qs);
  }

  // slice-20 AC-1〜4: ソフト設問の回答を保存（本人のみ）。雑感は任意入力・本人非公開可（zakkan_visibility）。
  if ((m = hit('POST', /^\/reports\/([^/]+)\/soft-answers$/))) {
    const rep = reports.get(m[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    if (rep.user_id !== uid) return json(res, 403, { error: 'forbidden' });
    const body = await readBody(req);
    if (body === null) return json(res, 422, { error: 'validation_failed' });
    rep.soft_answers = {
      ai_use: typeof body.ai_use === 'string' ? body.ai_use : null, // スキル抽出へ
      issue: typeof body.issue === 'string' ? body.issue : null, // 内部・シート非反映
      shokan: typeof body.shokan === 'string' ? body.shokan : null, // 内部・シート非反映
      zakkan: typeof body.zakkan === 'string' ? body.zakkan : null, // AI 変換対象外・閲覧限定
      zakkan_visibility: body.zakkan_visibility === 'private' ? 'private' : 'limited', // 既定は限定閲覧
    };
    // レスポンスに雑感やスコアを出さない（AC-2/AC-4）。保存できたことだけ返す。
    return json(res, 200, { id: rep.id, saved: true });
  }

  // slice-20 AC-3: 雑感の閲覧。最小ロール（本人・担当 manager・メンタルケア担当）のみ。private は本人のみ。それ以外は 403。
  if ((m = hit('GET', /^\/reports\/([^/]+)\/zakkan$/))) {
    const rep = reports.get(m[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    const soft = rep.soft_answers ?? {};
    const vis = soft.zakkan_visibility ?? 'limited';
    const isOwner = rep.user_id === uid;
    const role = users.get(uid)?.role;
    const minRole = role === 'mental_care' || isAssignedManager(uid, rep.user_id);
    const canView = isOwner || (vis !== 'private' && minRole); // private は本人のみ・限定は最小ロール
    if (!canView) return json(res, 403, { error: 'forbidden' });
    return json(res, 200, { zakkan: soft.zakkan ?? null, visibility: vis }); // スコア・診断は含めない（AC-4）
  }

  // slice-21 AC-1〜5: 一括生成。manager のみ・自分の担当グループのみ・客先/部署/グループで絞り込み・未生成はスキップ＋manifest。
  if (hit('POST', /^\/admin\/skill-sheets\/bulk$/)) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' }); // staff は 403（AC-3）
    const body = await readBody(req);
    const groups = bulkMgrGroups(uid);
    const scope = bulkStaff
      .filter((s) => groups.includes(s.group_id)) // 自分の担当グループのみ（AC-3）
      .filter((s) => (typeof body?.group === 'string' ? s.group_id === body.group : true)) // グループ絞り込み（AC-2）
      .filter((s) => (typeof body?.client === 'string' ? s.client === body.client : true)) // 客先絞り込み（AC-2）
      .filter((s) => (typeof body?.dept === 'string' ? s.dept === body.dept : true)); // 部署絞り込み（AC-2）
    const entries = [];
    const skipped = [];
    for (const s of scope) {
      if (s.has_master) entries.push({ staff_id: s.id, filename: bulkFilename(s.name) }); // 最新マスターから生成（AC-1）・機械命名（AC-4）
      else skipped.push({ staff_id: s.id, reason: 'no_master' }); // 未生成はスキップ（AC-5）
    }
    return json(res, 200, {
      entries, // ZIP に含まれるシート（semantics fixture）
      skipped,
      manifest: { generated: entries.length, skipped: skipped.length, skipped_staff: skipped.map((x) => x.staff_id) }, // 除外者一覧を ZIP に同梱（AC-5）
    });
  }

  // slice-22 AC-1/AC-2: グループ設定を解決して返す（グループ固有部分は設定データから・新グループも設定追加だけで解決）。
  if ((m = hit('GET', /^\/groups\/([^/]+)\/settings$/))) {
    const g = groupSettings.get(m[1]);
    return g ? json(res, 200, g) : json(res, 404, { error: 'not_found' });
  }
  // slice-22 AC-2/AC-3/AC-4: グループ設定を編集（担当 manager のみ）。変更は翌日以降に適用（effective_from）。過去報告は不変。
  if ((m = hit('PUT', /^\/groups\/([^/]+)\/settings$/))) {
    if (!isGroupManager(uid, m[1])) return json(res, 403, { error: 'forbidden' }); // 担当外 manager・staff は 403（AC-4）
    const body = await readBody(req);
    if (body === null) return json(res, 422, { error: 'validation_failed' });
    const prev = groupSettings.get(m[1]) ?? { group_id: m[1] };
    const next = {
      group_id: m[1],
      question_set_version: typeof body.question_set_version === 'string' ? body.question_set_version : prev.question_set_version ?? null,
      template_style: typeof body.template_style === 'string' ? body.template_style : prev.template_style ?? null,
      tab_label: typeof body.tab_label === 'string' ? body.tab_label : prev.tab_label ?? null,
      effective_from: nextBusinessDay(), // 翌日以降に適用（AC-3）
    };
    groupSettings.set(m[1], next);
    return json(res, 200, next);
  }
  // slice-22 AC-3/AC-5: 過去の確定報告スナップショット（作成時点の group/設定・不変）。
  if ((m = hit('GET', /^\/report-snapshots\/([^/]+)$/))) {
    const snap = reportSnapshots.get(m[1]);
    return snap ? json(res, 200, snap) : json(res, 404, { error: 'not_found' });
  }
  // slice-22 AC-5: スタッフのグループ移管（現在の所属を変える）。過去報告スナップショットは変えない（元グループの不変履歴）。
  if ((m = hit('POST', /^\/admin\/staff\/([^/]+)\/transfer$/))) {
    if (!isManager(uid)) return json(res, 403, { error: 'forbidden' });
    const body = await readBody(req);
    if (typeof body?.to_group !== 'string') return json(res, 422, { error: 'validation_failed', field: 'to_group' });
    staffCurrentGroup.set(m[1], body.to_group); // 現在の所属のみ変更（過去 snapshot は不変）
    return json(res, 200, { staff_id: m[1], current_group: body.to_group });
  }

  // slice-23 AC-1/AC-4/AC-5: 要約後の薄い項目へ一度だけ追加質問を生成・提示する（ルール検出＝決定的）。二重質問しない。
  if ((m = hit('POST', /^\/reports\/([^/]+)\/follow-up$/))) {
    const rep = reports.get(m[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    if (rep.user_id !== uid) return json(res, 403, { error: 'forbidden' });
    if (rep.status === 'confirmed') return json(res, 409, { error: 'confirmed_immutable' }); // 確定後は質問しない（原則6）
    if (rep.follow_up && rep.follow_up.state !== 'none') return json(res, 200, rep.follow_up); // 一度きり・二重質問しない（AC-5）
    if (typeof rep.raw_text === 'string' && rep.raw_text.includes('__FOLLOWUP_DEGRADE__')) {
      rep.follow_up = { state: 'degraded' }; // 質問自体が出せなかった（AC-4）→ 必須ブロックを発動しない
      return json(res, 200, rep.follow_up);
    }
    if (!isThin(rep.ai_summary_json)) {
      rep.follow_up = { state: 'not_needed' }; // 薄くない＝質問不要
      return json(res, 200, rep.follow_up);
    }
    const body = await readBody(req);
    rep.follow_up = { state: 'asked', required: body?.required === true, question: 'issues（課題）について、具体的な内容を教えてください。' };
    return json(res, 200, rep.follow_up); // 薄い対象カテゴリへ一度だけ生成・提示（AC-1）
  }

  // slice-23 AC-2: 追加質問への回答を本文へ追記し、要約を作り直す（下書きのまま・確定済みは変えない）。
  if ((m = hit('POST', /^\/reports\/([^/]+)\/follow-up\/answer$/))) {
    const rep = reports.get(m[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    if (rep.user_id !== uid) return json(res, 403, { error: 'forbidden' });
    if (rep.status === 'confirmed') return json(res, 409, { error: 'confirmed_immutable' }); // 確定済みは不変（原則6）
    const body = await readBody(req);
    if (rep.follow_up?.state !== 'asked') return json(res, 422, { error: 'no_pending_follow_up' });
    if (typeof body?.answer !== 'string' || !body.answer.length) return json(res, 422, { error: 'validation_failed', field: 'answer' });
    rep.raw_text = `${rep.raw_text}\n${body.answer}`; // 回答は raw_text へ追記（確定前のみ）
    rep.ai_summary_json = summarize(rep.raw_text); // 本文追記後に要約を作り直す
    rep.follow_up = { ...rep.follow_up, state: 'answered' };
    return json(res, 200, { id: rep.id, status: rep.status, raw_text: rep.raw_text, ai_summary_json: rep.ai_summary_json });
  }

  // slice-01 AC-1/AC-4: POST /reports
  if (hit('POST', /^\/reports$/)) {
    const body = await readBody(req);
    if (body === null || typeof body.report_date !== 'string' || body.report_date.length === 0) {
      return json(res, 422, { error: 'validation_failed', field: 'report_date' });
    }
    const id = nextId();
    const rep = {
      id,
      user_id: uid,
      report_date: body.report_date,
      raw_text: typeof body.raw_text === 'string' ? body.raw_text : '',
      status: 'draft',
      ai_summary_json: null,
      confirmed_summary: null,
    };
    reports.set(id, rep);
    return json(res, 201, rep);
  }

  // slice-04 AC-1: GET /reports（自分の一覧）
  if (hit('GET', /^\/reports$/)) {
    const mine = [...reports.values()]
      .filter((r) => r.user_id === uid)
      .sort((a, b) => (a.report_date < b.report_date ? 1 : -1));
    return json(res, 200, { reports: mine });
  }

  // slice-05: GET /reports/:id/previous（前回の確定報告 or なし）
  if ((m = hit('GET', /^\/reports\/([^/]+)\/previous$/))) {
    const target = reports.get(m[1]);
    if (!target) return json(res, 404, { error: 'not_found' });
    if (target.user_id !== uid) return json(res, 403, { error: 'forbidden' });
    const prev = [...reports.values()]
      .filter((r) => r.user_id === uid && r.status === 'confirmed' && r.id !== m[1])
      .sort((a, b) => (a.report_date < b.report_date ? 1 : -1))[0];
    return json(res, 200, prev ? { previous: { raw_text: prev.raw_text, summary: prev.confirmed_summary } } : { previous: null });
  }

  // slice-02: POST /reports/:id/summarize
  if ((m = hit('POST', /^\/reports\/([^/]+)\/summarize$/))) {
    const rep = reports.get(m[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    if (rep.user_id !== uid) return json(res, 403, { error: 'forbidden' });
    if (typeof rep.raw_text === 'string' && rep.raw_text.includes('__FAIL__')) {
      return json(res, 502, { error: 'summarizer_failed' }); // AC-4: 下書きは draft のまま保持
    }
    // slice-20: ソフト設問を反映（AI活用→スキル）。雑感は Summarizer へ渡さず出力にも出さない（AC-1/AC-2）。スコア化なし（AC-4）。
    rep.ai_summary_json = applySoftAnswersToSummary(summarize(rep.raw_text), rep.soft_answers);
    return json(res, 200, rep.ai_summary_json);
  }

  // slice-03: POST /reports/:id/confirm
  if ((m = hit('POST', /^\/reports\/([^/]+)\/confirm$/))) {
    const rep = reports.get(m[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    if (rep.user_id !== uid) return json(res, 403, { error: 'forbidden' });
    if (rep.status === 'confirmed') return json(res, 409, { error: 'already_confirmed' }); // AC-3
    const body = await readBody(req);
    if (body === null) return json(res, 422, { error: 'validation_failed' });
    // slice-23 AC-3/AC-4: 必須の追加質問が「提示されたのに未回答」なら確定ブロック（422）。任意・回答済み・degrade は通す。
    if (rep.follow_up?.state === 'asked' && rep.follow_up.required) {
      return json(res, 422, { error: 'follow_up_required', question: rep.follow_up.question }); // 答えるまで確定できない
    }
    // slice-11: 対応案件の紐づけ＋インシデント状態。バリデーション（不正 status は 422）を mutate より先に行う（AC-4・原子性）。
    const inputProjects = Array.isArray(body.projects) ? body.projects : [];
    for (const p of inputProjects) {
      for (const inc of p.incidents ?? []) {
        if (!INCIDENT_STATUSES.includes(inc.status)) {
          return json(res, 422, { error: 'validation_failed', field: 'incident.status' }); // 未 mutate＝部分適用なし
        }
      }
    }
    // 検証通過後に mutate。案件キーで既存/新規を解決し（slice-11 AC-1/AC-3）、インシデントを案件へ紐づける（AC-2）。
    // 続けて slice-12: 案件×期間で MASTER_SUMMARIES を upsert（増分・incident key で最新上書き・AC-1/2/4）＝確定に同期（AC-5）。
    const period = periodOf(rep.report_date);
    const linkedProjects = [];
    const linkedIncidents = [];
    const touchedSummaries = [];
    for (const p of inputProjects) {
      const proj = resolveProject(uid, p.project_key, p.client_name);
      const incs = p.incidents ?? [];
      for (const inc of incs) linkedIncidents.push({ project_id: proj.id, status: inc.status });
      if (incs.length) proj.status = incs[incs.length - 1].status; // PROJECT.status = 最新インシデント status
      linkedProjects.push({ id: proj.id, project_key: proj.project_key, client_name: proj.client_name, status: proj.status });

      // slice-12 突合: (user_id, project_id, period) で upsert。既存 summary に新報告のみをマージ（全再処理でない・AC-1）。
      const skey = `${uid}|${proj.id}|${period}`;
      const existing = masterSummaries.get(skey);
      const byKey = new Map((existing?.summary.incidents ?? []).map((i) => [i.key, i])); // incident key で dedup
      incs.forEach((inc, idx) => {
        const k = inc.key ?? `INC-${idx + 1}`; // key 省略時は位置キー
        byKey.set(k, { key: k, status: inc.status }); // 同一 key は最新 status で上書き（追記でない・AC-2）
      });
      const row = {
        user_id: uid,
        project_id: proj.id,
        period,
        summary: { incidents: [...byKey.values()] },
        reconciled_at: new Date().toISOString(),
      };
      masterSummaries.set(skey, row); // 同一キーは重複行を作らず上書き（冪等・AC-4）
      touchedSummaries.push(row);
    }
    rep.confirmed_summary = body.summary ?? rep.ai_summary_json ?? summarize(rep.raw_text);
    rep.status = 'confirmed';
    rep.projects = linkedProjects;
    rep.incidents = linkedIncidents;
    // master_summaries は MASTER_SUMMARIES に upsert 済み。レスポンスにのみ含め、rep には保存しない（REPORTS 不変・AC-3）。
    return json(res, 200, { ...rep, master_summaries: touchedSummaries });
  }

  // slice-04 AC-2/AC-3, slice-06 AC-4: GET /reports/:id（詳細・所有権）
  if ((m = hit('GET', /^\/reports\/([^/]+)$/))) {
    const rep = reports.get(m[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    if (rep.user_id !== uid) return json(res, 403, { error: 'forbidden' });
    return json(res, 200, rep);
  }

  // slice-01 AC-2/AC-3: PATCH /reports/:id
  if ((m = hit('PATCH', /^\/reports\/([^/]+)$/))) {
    const rep = reports.get(m[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    if (rep.user_id !== uid) return json(res, 403, { error: 'forbidden' });
    if (rep.status === 'confirmed') return json(res, 409, { error: 'confirmed_immutable' });
    const body = await readBody(req);
    if (body === null) return json(res, 422, { error: 'validation_failed' });
    if (typeof body.raw_text === 'string') rep.raw_text = body.raw_text;
    return json(res, 200, rep);
  }

  return json(res, 404, { error: 'not_found', path });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[reference-mock] Phase1(slice-01..07)+slice-08 oracle listening on http://localhost:${PORT}`);
});
