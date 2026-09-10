const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'images');
const recipesPath = path.join(ROOT, 'info', 'recipes.json');
let recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));

const BASE = 'https://fieldsofmistria.wiki.gg';

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'RecipeFinder/1.0' }, timeout: 20000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// unique full-size urls in order
const seen = new Set();
const urls = [];
function addImg(img) {
  if (!img) return;
  const base = path.basename(img.split('?')[0]);
  const key = base;
  if (!seen.has(key)) { seen.add(key); urls.push({ base, remote: BASE + img }); }
}
recipes.forEach((r) => {
  addImg(r.image);
  r.ingredients.forEach((i) => addImg(i.img));
});
console.log('unique images to download:', urls.length);

// safe local filename
function localName(base) {
  let n = base.replace(/[^a-z0-9._-]/gi, '_');
  return n;
}

// ensure names unique on disk
const used = new Set();
urls.forEach((u) => {
  let name = localName(u.base);
  if (used.has(name)) name = name.replace(/\.(png|jpg|jpeg|gif)$/i, `_${Math.floor(Math.random()*1e5)}$1`);
  used.add(name);
  u.local = name;
});

fs.mkdirSync(IMG_DIR, { recursive: true });

const CON = 10;
let next = 0, ok = 0, failed = 0;
const map = new Map(); // base -> local

async function worker() {
  while (true) {
    const i = next++;
    if (i >= urls.length) return;
    const u = urls[i];
    const out = path.join(IMG_DIR, u.local);
    try {
      if (fs.existsSync(out) && fs.statSync(out).size > 50) { map.set(u.base, u.local); ok++; continue; }
      const buf = await get(u.remote);
      if (buf.length < 50) throw new Error('tiny response');
      fs.writeFileSync(out, buf);
      map.set(u.base, u.local); ok++;
    } catch (e) { failed++; console.log('FAIL', u.remote, '-', e.message); }
  }
}

(async () => {
  await Promise.all(Array.from({ length: CON }, worker));
  console.log(`DONE ok=${ok} failed=${failed}`);
  if (failed) console.log('FAILED FILES:', urls.filter((u) => !map.has(u.base)).map((u)=>u.remote).join('\n'));

  // rewrite recipes to local relative paths
  recipes.forEach((r) => {
    if (r.image && map.has(path.basename(r.image.split('?')[0]))) {
      r.image = 'images/' + map.get(path.basename(r.image.split('?')[0]));
    }
    r.ingredients.forEach((i) => {
      const base = path.basename(i.img.split('?')[0]);
      if (map.has(base)) i.img = 'images/' + map.get(base);
    });
  });

  // bundle reference data for the app
  const outData = path.join(ROOT, 'data.json');
  fs.writeFileSync(outData, JSON.stringify(recipes, null, 2), 'utf8');
  console.log('wrote data.json with', recipes.length, 'recipes');
  // also write an ingredient usage index for fast front-end lookup
  const ingIndex = {};
  recipes.forEach((r) => {
    r.ingredients.forEach((ing) => {
      const k = ing.name.toLowerCase();
      (ingIndex[k] = ingIndex[k] || []).push({ recipe: r.name, qty: ing.qty, img: ing.img });
    });
  });
  fs.writeFileSync(path.join(ROOT, 'ingredient-index.json'), JSON.stringify(ingIndex, null, 2), 'utf8');
  console.log('ingredient index keys:', Object.keys(ingIndex).length);
})();