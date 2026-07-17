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
    rep.confirmed_summary = body.summary ?? rep.ai_summary_json ?? summarize(rep.raw_text);
    rep.status = 'confirmed';
    return json(res, 200, rep);
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
