const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const html = fs.readFileSync(path.join(__dirname, '..', 'info', 'cooking_full.html'), 'utf8');
const $ = cheerio.load(html);

// Find all recipe tables: tables whose header includes 'Ingredients'
const tables = [];
$('table.mw-collapsible, table.wikitable, table').each((i, tb) => {
  const hdrs = [];
  $(tb).find('tr').first().find('th').each((j, th) => hdrs.push($(th).text().trim()));
  if (hdrs.some((h) => /ingredient|recipe/i.test(h))) {
    tables.push({ idx: i, hdrs });
  }
});
console.log('TABLES FOUND:', tables.length);
tables.forEach((t, i) => console.log(i, '→', JSON.stringify(t.hdrs.slice(0, 9))));

// Section headings with images (category icons) - find h3/h4 that precede tables
console.log('\n--- HEADINGS containing an img + text ---');
$('h3,h4,h2').each((i, h) => {
  const t = $(h).text().trim();
  const img = $(h).find('img').first().attr('src') || '';
  if (img || t) console.log($(h)[0].name, '|', t, '|', img);
});