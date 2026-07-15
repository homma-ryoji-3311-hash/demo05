// 実行可能な reference-mock（answer key の振る舞いオラクル）— slice-01 report-draft スコープ。
//
// なぜ reference-mock/ の外にあるか（PM 承認・2026-07-15）:
//   vendor した reference-mock/（answer key の文書）は ADR-0005 どおり read-only のまま保つ。
//   実行オラクルはそれとは別の authored artifact なので、保護外の tools/ に置く。
//   「reference-mock＝文書ベース read-only」とする ADR-0005/0018 を、PM 承認のもと
//   「文書は read-only＋実行オラクルは authored」へ改訂する（根拠は docs/memory-bank/pending-*、
//   docs/adr/ への確定は人が行う）。
//
// 依存ゼロ（Node 組み込み http のみ）。acceptance は ACCEPTANCE_BASE_URL でここへ接続する。
// 実装の正本は docs/spec/slice-01.md（approved）と reference-mock/spec.md §3.2。
//
// slice-01 の AC を緑にするだけの最小オラクル:
//   AC-1 POST /reports         → 201 {id,status:'draft'} / 422（report_date 欠落）
//   AC-2 PATCH /reports/:id     → 200（draft の raw_text 更新）
//   AC-3 PATCH /reports/:id     → 409（confirmed は不変）
//   AC-4 POST /reports          → 422（不正ボディ）
// 参照/検証補助: GET /reports/:id, GET /api/health

import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8000);

/** @type {Map<string, {id:string,user_id:string,report_date:string,raw_text:string,status:'draft'|'confirmed'}>} */
const reports = new Map();
let seq = 0;
const nextId = () => `r_${String(++seq).padStart(4, '0')}`;

// AC-3 検証用に確定済み報告を1件シード（合成・確定後不変の対象）
reports.set('r_seed_confirmed', {
  id: 'r_seed_confirmed',
  user_id: 'staff01',
  report_date: '2026-07-14',
  raw_text: '前日はテスト整備を実施。',
  status: 'confirmed',
});

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve(null); // 不正 JSON
      }
    });
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const m = (method, re) => req.method === method && re.exec(path);

  // health（runner の ready 判定用）
  if (m('GET', /^\/api\/health$/)) return json(res, 200, { status: 'ok' });

  // AC-1 / AC-4  POST /reports
  if (m('POST', /^\/reports$/)) {
    const body = await readBody(req);
    // 422: 不正ボディ / report_date 欠落（バリデーション失敗＝422・CLAUDE.md §6）
    if (body === null || typeof body.report_date !== 'string' || body.report_date.length === 0) {
      return json(res, 422, { error: 'validation_failed', field: 'report_date' });
    }
    const id = nextId();
    const rep = {
      id,
      user_id: 'staff01',
      report_date: body.report_date,
      raw_text: typeof body.raw_text === 'string' ? body.raw_text : '',
      status: 'draft',
    };
    reports.set(id, rep);
    return json(res, 201, rep);
  }

  // GET /reports/:id（検証補助）
  let mm;
  if ((mm = m('GET', /^\/reports\/([^/]+)$/))) {
    const rep = reports.get(mm[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    return json(res, 200, rep);
  }

  // AC-2 / AC-3  PATCH /reports/:id
  if ((mm = m('PATCH', /^\/reports\/([^/]+)$/))) {
    const rep = reports.get(mm[1]);
    if (!rep) return json(res, 404, { error: 'not_found' });
    if (rep.status === 'confirmed') {
      return json(res, 409, { error: 'confirmed_immutable' }); // AC-3 確定後不変
    }
    const body = await readBody(req);
    if (body === null) return json(res, 422, { error: 'validation_failed' });
    if (typeof body.raw_text === 'string') rep.raw_text = body.raw_text; // AC-2 下書き自動保存
    return json(res, 200, rep);
  }

  return json(res, 404, { error: 'not_found', path });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[reference-mock] slice-01 oracle listening on http://localhost:${PORT}`);
});
