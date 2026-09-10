const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'info', 'cooking_full.html'), 'utf8');
const $ = cheerio.load(html);

function cleanHeading(t) {
  return t.replace(/\[edit[^\]]*\]/gi, '').replace(/[\s\u00a0\u2000-\u200a]+/g, ' ').trim();
}
function textOf($td) {
  return $td.text().replace(/\s+/g, ' ').trim();
}
function fullImgSrc(ref) {
  const m = ref.match(/\/images\/thumb\/(.+?)\/\d+px-[^\/]+\?([a-f0-9]+)$/i);
  if (m) return `/images/${m[1]}?${m[2]}`;
  return ref;
}

// Build ordered block list across the whole document.
const blocks = [];
$('h2,h3,h4,table').each((_, el) => {
  const $el = $(el);
  if (el.name === 'h2') blocks.push({ type: 'h2', text: cleanHeading($el.text()) });
  else if (el.name === 'h3') blocks.push({ type: 'h3', text: cleanHeading($el.text()) });
  else if (el.name === 'h4') blocks.push({ type: 'h4', text: cleanHeading($el.text()) });
  else {
    const hdrs = [];
    $el.find('tr').first().find('th').each((_, th) => hdrs.push($(th).text().trim()));
    if (/ingredient/i.test(hdrs.join(' '))) blocks.push({ type: 'table', el });
  }
});

const start = blocks.findIndex((b) => b.type === 'h2' && b.text === 'Recipes');
const end = blocks.findIndex((b) => b.type === 'h2' && /Food Without Recipes/.test(b.text));
console.log('block range:', start, '→', end, 'of', blocks.length);
if (start < 0) { console.error('Start heading not found'); process.exit(1); }
const stop = end < 0 ? blocks.length : end;

function ingredientQtyPairs($td) {
  const out = [];
  const links = $td.find('a').filter((_, a) => !!$(a).find('img[src*="/images/thumb/"]')[0]);
  links.each((_, a) => {
    const title = ($(a).attr('title') || $(a).text()).trim();
    const img = $(a).find('img').first().attr('src') || '';
    out.push({ name: title, img: fullImgSrc(img), qty: 1 });
  });
  const qtyMatches = ($td.text().match(/\((\d+)\)/g) || []).map((s) => parseInt(s.replace(/[()]/g, ''), 10));
  out.forEach((ing, i) => { if (qtyMatches[i] != null) ing.qty = qtyMatches[i]; });
  return out;
}

function parseRow($, $tb, main, sub) {
  const rows = [];
  $tb.find('tr').each((_, tr) => {
    const tds = $(tr).children('td');
    if (tds.length < 6) return;
    const $1 = $(tds[1]);
    const name = $1.find('a').first().text().trim() || textOf($1);
    if (!name) return;

    const recipeImg = ($(tds[0]).find('img[src*="/images/"]').first().attr('src') || '').replace(/^\//, '/');
    const ingredients = ingredientQtyPairs($(tds[2]));

    const recoupNums = (textOf($(tds[3])).match(/\d+/g) || []).map(Number);
    const $5 = $(tds[5]);
    const qualityImg = $5.find('img[src*="Quality"]').attr('src') || '';
    const quality = ((qualityImg.match(/Quality_([1-5])\./) || [])[1]) || null;
    const kitImg = $5.find('img[src*="Kitchen_level"]').attr('src') || '';
    const kitchen = ((kitImg.match(/Kitchen_level_([0-3])/) || [])[1]) || null;
    const cookText = textOf($5);
    const cookMatch = cookText.match(/(\d+)$/);
    const cookingLevel = $5.find('img[src*="Skill_icon_cooking"]').length ? (cookMatch ? +cookMatch[1] : null) : null;

    if (!ingredients.length) console.warn('WARN no ingredients for', name);

    rows.push({
      name,
      category: main || '',
      subcategory: sub || '',
      image: fullImgSrc(recipeImg),
      ingredients, // {name,img,qty}
      health: recoupNums[0] != null ? recoupNums[0] : null,
      stamina: recoupNums[1] != null ? recoupNums[1] : null,
      time: textOf($(tds[4])),
      quality: quality != null ? +quality : null,
      kitchenLevel: kitchen != null ? +kitchen : null,
      cookingLevel,
      source: textOf($(tds[6])),
      sell: (() => { const c = $(tds[7]).clone(); c.find('span[style*="display:none"]').remove(); return textOf(c); })(),
    });
  });
  return rows;
}

let recipes = [];
let main = null, sub = null;
for (let i = start + 1; i < stop; i++) {
  const b = blocks[i];
  if (b.type === 'h3') { main = b.text; sub = null; continue; }
  if (b.type === 'h4') { sub = b.text; continue; }
  if (b.type === 'table') {
    recipes = recipes.concat(parseRow($, $(b.el), main, sub));
  }
}

// dedupe
const seen = new Set();
recipes = recipes.filter((r) => { const k = r.name; if (seen.has(k)) return false; seen.add(k); return true; });

fs.writeFileSync(path.join(ROOT, 'info', 'recipes.json'), JSON.stringify(recipes, null, 2), 'utf8');
console.log('TOTAL RECIPES:', recipes.length);

const byCat = {};
recipes.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
console.log('BY CATEGORY:', JSON.stringify(byCat));

const imgSet = new Set();
recipes.forEach((r) => {
  if (r.image) imgSet.add(r.image);
  r.ingredients.forEach((i) => { if (i.img) imgSet.add(fullImgSrc(i.img)); });
});
console.log('UNIQUE IMAGES NEEDED:', imgSet.size);