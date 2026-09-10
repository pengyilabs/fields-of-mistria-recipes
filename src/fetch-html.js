const https = require('https');
const fs = require('fs');
const path = require('path');

const API = 'https://fieldsofmistria.wiki.gg/api.php?action=parse&page=Cooking&prop=text&format=json&formatversion=2';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RecipeFinder/1.0 (personal tool)' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

(async () => {
  const buf = await get(API);
  const json = JSON.parse(buf.toString('utf8'));
  const html = json.parse.text;
  const outDir = path.join(__dirname, '..', 'info');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'cooking_full.html'), html, 'utf8');
  console.log('HTML bytes:', Buffer.byteLength(html, 'utf8'));
})().catch((e) => { console.error(e); process.exit(1); });