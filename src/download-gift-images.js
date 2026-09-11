// Download character portraits + gift item icons locally, then repoint gifts-data.json at them.
// Resilient: repeatedly retries only the files still missing until everything is present.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataFile = path.join(root, 'gifts-data.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const PORT_DIR = path.join(root, 'images', 'gifts', 'portraits');
const ITEM_DIR = path.join(root, 'images', 'gifts', 'items');
for (const d of [PORT_DIR, ITEM_DIR]) fs.mkdirSync(d, { recursive: true });

function slug(name) {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_');
}
function extFromUrl(url) {
  const m = url.match(/\.([A-Za-z0-9]+)(\?|$)/);
  return (m && m[1].toLowerCase()) || 'png';
}
function localRel(destDir, name, url) {
  return 'images/gifts/' + path.basename(destDir) + '/' + slug(name) + '.' + extFromUrl(url);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const API = 'https://fieldsofmistria.wiki.gg/api.php';

// Resolve the canonical direct URL (https://fieldsofmistria.wiki.gg/images/<name>?<hash>)
// for a Special:FilePath URL, so downloads hit the cacheable /images/ endpoint directly.
async function resolveDirect(fileUrl) {
  const m = fileUrl.match(/Special:FilePath\/([^?#]+)/);
  if (!m) return fileUrl;
  const fileTitle = 'File:' + decodeURIComponent(m[1].replace(/_/g, ' '));
  const params = new URLSearchParams({
    action: 'query', titles: fileTitle, prop: 'imageinfo', iiprop: 'url', format: 'json',
  });
  for (let a = 0; a < 4; a++) {
    try {
      const res = await fetch(API + '?' + params.toString());
      if (res.ok) {
        const j = await res.json();
        const pg = Object.values(j.query && j.query.pages ? j.query.pages : {})[0];
        const url = pg && pg.imageinfo && pg.imageinfo[0] && pg.imageinfo[0].url;
        if (url) return url;
      }
    } catch (_) {}
    await delay(800 * (a + 1));
  }
  return fileUrl;
}

async function tryFetch(url, attempts) {
  for (let a = 0; a < attempts; a++) {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length) return buf;
    }
    await delay(1000 * (a + 1) + Math.random() * 500);
  }
  return null;
}

(async () => {
  // Build the full target list from current data (which has wiki URLs).
  const targets = [];
  for (const c of data.characters) {
    if (!c.portrait) continue;
    targets.push({ key: 'P:' + c.name, url: c.portrait, rel: localRel(PORT_DIR, c.name, c.portrait) });
  }
  const giftNames = new Set();
  for (const ch in data.gifts) for (const t in data.gifts[ch]) for (const n of data.gifts[ch][t]) giftNames.add(n);
  for (const n of giftNames) {
    const it = data.items[n];
    if (!it || !it.icon) continue;
    targets.push({ key: 'I:' + n, url: it.icon, rel: localRel(ITEM_DIR, n, it.icon) });
  }

  // Resolve direct URLs up front (concurrency 3, each with retry).
  console.log(`Resolving ${targets.length} direct URLs...`);
  let rIdx = 0;
  async function resolver() {
    while (rIdx < targets.length) {
      const t = targets[rIdx++];
      t.url = await resolveDirect(t.url);
    }
  }
  await Promise.all(Array.from({ length: 3 }, resolver));
  console.log('Resolved. Downloading...');

  const maxPasses = 30;
  const CONC = 4;
  let ok = 0;
  let stillMissing = targets;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runPass(list) {
    let idx = 0;
    const pending = [];
    const added = { n: 0 };
    async function worker() {
      while (idx < list.length) {
        const t = list[idx++];
        const abs = path.join(root, t.rel);
        if (fs.existsSync(abs) && fs.statSync(abs).size > 0) { ok++; continue; }
        const buf = await tryFetch(t.url, 3);
        if (buf) { fs.writeFileSync(abs, buf); ok++; added.n++; }
        else pending.push(t);
        await sleep(220);
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    return { pending, added: added.n };
  }

  for (let pass = 1; pass <= maxPasses; pass++) {
    if (!stillMissing.length) break;
    console.log(`--- pass ${pass}: ${stillMissing.length} to fetch (conc=${CONC}) ---`);
    const { pending, added } = await runPass(stillMissing);
    console.log(`pass ${pass} done: ${added} new, ${pending.length} still missing`);
    stillMissing = pending;
    if (pending.length) await sleep(5000);
  }

  // Repoint data to local files (only for files we have).
  for (const t of targets) {
    const abs = path.join(root, t.rel);
    const have = fs.existsSync(abs) && fs.statSync(abs).size > 0;
    if (t.key.startsWith('P:')) {
      const c = data.characters.find((x) => x.name === t.key.slice(2));
      if (c) c.portrait = have ? '/' + t.rel : '';
    } else {
      const it = data.items[t.key.slice(2)];
      if (it) it.icon = have ? '/' + t.rel : '';
    }
  }

  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  console.log(`DONE: ${ok} files ok, ${stillMissing.length} still missing.`);
})().catch((e) => { console.error(e); process.exit(1); });