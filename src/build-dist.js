// Assemble the deployable static site into dist/ from committed assets.
// Copies the HTML/JS/CSS/JSON assets and images, skipping the wiki scrape.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  'index.html',
  'app.js',
  'styles.css',
  'data.json',
  'gifts-data.json',
  'translations.json',
  'ingredient-index.json',
];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

function copy(src, dest) {
  const st = fs.lstatSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copy(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

let copied = 0;
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) {
    console.warn('SKIP (missing):', f);
    continue;
  }
  fs.copyFileSync(src, path.join(DIST, f));
  copied++;
}

const imgSrc = path.join(ROOT, 'images');
if (fs.existsSync(imgSrc)) {
  copy(imgSrc, path.join(DIST, 'images'));
}

console.log(`dist ready: ${copied} files + images/`);
