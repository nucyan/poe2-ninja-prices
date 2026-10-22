#!/usr/bin/env node
// poe.ninja（PoE2）の価格を取得して poe2/ に保存する。Node.js 18 以降、npm 依存なし。
// GitHub Actions（.github/workflows/update-prices.yml）から一定時間ごとに実行し、結果をコミットする。
//
//   node update-prices.mjs [--leagues "Runes of Aldur,Standard"] [--out poe2]
//
// 出力:
//   poe2/leagues.json        取得したリーグの一覧と取得日時
//   poe2/<リーグのファイル名>.json  そのリーグの全品目の価格（Divine Orb 建て）
//
// poe.ninja の API（https://poe.ninja/docs/api）はブラウザから直接読めない（CORS ヘッダーがない）ため、
// ここで取得して静的ファイルにする。識別できる User-Agent を送り、リクエストの間隔を空ける。

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://poe.ninja';
const UA = 'poe2-craft-planner price snapshot (GitHub Actions; https://github.com/)';
// クラフトに使う品目のカテゴリ（poe.ninja の exchange overview の type）
const TYPES = ['Currency', 'Fragments', 'Abyss', 'Essences', 'SoulCores', 'Idols', 'Runes', 'Ritual', 'Expedition', 'Delirium', 'Breach', 'Verisium'];
const WAIT_MS = 1500;

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1]]] : a), /** @type {[string, string][]} */ ([])));
const outDir = path.resolve(args.out || 'poe2');
const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/** @param {string} url */
async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) return res.json();
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`${url} → HTTP ${res.status}`);
    await sleep(WAIT_MS * 2 ** attempt);
  }
}

/** リーグ名をファイル名にする（英数字とハイフン） @param {string} id */
export const leagueFile = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const leagues = /** @type {{id: string, name: string}[]} */ (await getJson(`${BASE}/poe2/api/economy/leagues`));
const wanted = args.leagues ? String(args.leagues).split(',').map((s) => s.trim()) : leagues.map((l) => l.id);
await mkdir(outDir, { recursive: true });
const fetchedAt = new Date().toISOString();
const index = [];
for (const league of leagues.filter((l) => wanted.includes(l.id))) {
  /** @type {Record<string, {name: string, value: number, type: string}>} */
  const items = {};
  /** @type {Record<string, number>} */
  let rates = {};
  let primary = null;
  const failed = [];
  for (const type of TYPES) {
    const url = `${BASE}/poe2/api/economy/exchange/current/overview?league=${encodeURIComponent(league.id)}&type=${encodeURIComponent(type)}`;
    try {
      const body = await getJson(url);
      const names = new Map((body.items || []).map((/** @type {any} */ i) => [i.id, i.name]));
      if (body.lines?.length) {
        if (primary && body.core?.primary !== primary) throw new Error(`基準通貨が ${primary} と ${body.core?.primary} で異なります`);
        primary = body.core?.primary ?? primary;
        rates = body.core?.rates || rates;
      }
      for (const l of body.lines || []) {
        if (typeof l.id === 'string' && typeof l.primaryValue === 'number') items[l.id] = { name: names.get(l.id) || l.id, value: l.primaryValue, type };
      }
    } catch (e) {
      failed.push({ type, error: e instanceof Error ? e.message : String(e) });
    }
    await sleep(WAIT_MS);
  }
  const file = `${leagueFile(league.id)}.json`;
  await writeFile(path.join(outDir, file), JSON.stringify({
    format: 'poe2-ninja-prices', formatVersion: 1, league: league.id, fetchedAt,
    baseCurrency: primary || 'divine', rates, source: `${BASE}/poe2/economy`, failed, items,
  }, null, 1) + '\n');
  index.push({ id: league.id, name: league.name, file, items: Object.keys(items).length, failed: failed.length });
  console.log(`${league.id}: ${Object.keys(items).length} 品目${failed.length ? `（失敗 ${failed.length} カテゴリ）` : ''}`);
}
await writeFile(path.join(outDir, 'leagues.json'), JSON.stringify({ format: 'poe2-ninja-price-index', formatVersion: 1, fetchedAt, leagues: index }, null, 1) + '\n');
