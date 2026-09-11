// Build gifts-data.json from the Fields of Mistria wiki Cargo API.
// Fetches: characters, per-character gift preferences, item names/descriptions/icons,
// and resolves each character's portrait image.
const fs = require('fs');
const path = require('path');

const API = 'https://fieldsofmistria.wiki.gg/api.php';
const FILE_URL = 'https://fieldsofmistria.wiki.gg/wiki/Special:FilePath/';

async function jfetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function cargoQuery({ tables, fields, where = '', offset = 0, limit = 500 }) {
  const p = new URLSearchParams({
    action: 'cargoquery',
    tables,
    fields,
    format: 'json',
    offset: String(offset),
    limit: String(limit),
  });
  if (where) p.set('where', where);
  return API + '?' + p.toString();
}

async function paginate(tables, fields, where = '') {
  const rows = [];
  let offset = 0;
  for (;;) {
    const data = await jfetch(cargoQuery({ tables, fields, where, offset, limit: 500 }));
    const chunk = ((data.cargoquery || [])).map((r) => Object.fromEntries(
      Object.entries(r.title).map(([k, v]) => [k, v])
    ));
    rows.push(...chunk);
    if (chunk.length < 500) break;
    offset += 500;
  }
  return rows;
}

function fileUrl(fileName) {
  if (!fileName) return '';
  const base = fileName.replace(/^File:/, '').replace(/\s+/g, '_');
  return FILE_URL + encodeURIComponent(base);
}

async function resolvePortrait(name) {
  const params = new URLSearchParams({
    action: 'query', prop: 'images', imlimit: '500', format: 'json', titles: name,
  });
  const data = await jfetch(API + '?' + params.toString());
  const pg = Object.values(data.query && data.query.pages ? data.query.pages : {})[0];
  const imgs = (pg && pg.images || []).map((x) => x.title);
  const lower = imgs.map((f) => f.toLowerCase());
  const idx = (pred) => imgs.find((_, i) => pred(lower[i]));
  let file =
    idx((l) => l.includes('portrait') && /\.(png|gif|jpe?g)$/.test(l)) ||
    idx((l) => (l.endsWith('full.png') || l.endsWith('full.gif'))) ||
    idx((l) => l.includes('icon') && /\.(png|gif|jpe?g)$/.test(l)) ||
    imgs.find((f) => /\.(png|gif|jpe?g)$/.test(f.toLowerCase()));
  return fileUrl(file);
}

(async () => {
  console.log('Fetching characters...');
  const characters = await paginate(
    'Characters',
    'charName,romanceable,occupation,birth,gender,species'
  );

  console.log('Fetching gift preferences...');
  const giftRows = await paginate('GiftPrefs', 'charName,itemName,interest');

  console.log('Fetching items...');
  const itemRows = await paginate('Items', 'itemName,description,icon');

  // Build item lookup map
  const items = {};
  for (const it of itemRows) {
    items[it.itemName] = {
      name: it.itemName,
      desc: it.description || '',
      icon: fileUrl((it.icon || '').match(/File:([^\]]+)/)?.[1] || ''),
    };
  }

  // The canonical NPC roster = the set of characters who actually give/receive gifts.
  const gifters = Array.from(new Set(giftRows.map((g) => g.charName))).sort();
  const metaByName = {};
  for (const c of characters) {
    const isCanonical = /^[A-Za-z][A-Za-z' -]*$/.test(c.charName) && !/doc|sandbox|\//i.test(c.charName);
    if (!isCanonical) continue;
    if (gifters.includes(c.charName) && !metaByName[c.charName]) {
      metaByName[c.charName] = c;
    }
  }

  console.log(`Resolving ${gifters.length} portraits...`);
  const charList = [];
  let missing = [];
  for (const name of gifters) {
    const portrait = await resolvePortrait(name);
    const meta = metaByName[name] || {};
    if (!portrait) missing.push(name);
    charList.push({
      name,
      romanceable: meta.romanceable === '1',
      occupation: meta.occupation || '',
      birth: meta.birth || '',
      gender: meta.gender || '',
      species: meta.species || '',
      portrait,
    });
    await new Promise((r) => setTimeout(r, 120));
  }
  charList.sort((a, b) => (b.romanceable - a.romanceable) || a.name.localeCompare(b.name));
  if (missing.length) console.log('MISSING PORTRAITS:', JSON.stringify(missing));

  // Assemble gift map keyed by character, tier -> item names
  const gifts = {};
  for (const g of giftRows) {
    const tier = g.interest.toLowerCase();
    (gifts[g.charName] = gifts[g.charName] || {});
    (gifts[g.charName][tier] = gifts[g.charName][tier] || []).push(g.itemName);
  }

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    characters: charList,
    items: items,
    gifts: gifts,
  };

  const target = path.join(__dirname, '..', 'gifts-data.json');
  fs.writeFileSync(target, JSON.stringify(out, null, 2));
  console.log(`Wrote ${target}`);
  console.log(`  characters: ${charList.length}`);
  console.log(`  unique items: ${Object.keys(items).length}`);
  console.log(`  gift rows: ${giftRows.length}`);
})().catch((e) => {
  console.error('Build failed:', e);
  process.exit(1);
});