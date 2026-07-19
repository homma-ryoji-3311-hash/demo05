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
  ['staff01', { id: 'staff01', email: 'staff01@example.test', name: 'テスト太郎', role: 'staff' }],
  ['staff02', { id: 'staff02', email: 'staff02@example.test', name: 'テスト花子', role: 'staff' }],
  // slice-10: テンプレート管理は manager 権限。合成グループの管理者（下流 backend は同一 seed を持つこと）。
  ['mgr01', { id: 'mgr01', email: 'mgr01@example.test', name: '管理花子', role: 'manager', group_id: 'grp_synth_eng' }],
  // slice-21: 一括生成の担当 manager（複数グループ grp_engineer/grp_sales を担当）。
  ['bulk_mgr', { id: 'bulk_mgr', email: 'bulkmgr@example.test', name: '一括管理', role: 'manager', groups: ['grp_engineer', 'grp_sales'] }],
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

  // slice-06: /me
  if (hit('GET', /^\/me$/)) {
    const u = users.get(uid) ?? { id: uid, role: 'staff' };
    return json(res, 200, { id: u.id, role: u.role, name: u.name });
  }

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
    rep.ai_summary_json = summarize(rep.raw_text);
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
