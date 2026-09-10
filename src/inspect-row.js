const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const html = fs.readFileSync(path.join(__dirname, '..', 'info', 'cooking_full.html'), 'utf8');
const $ = cheerio.load(html);

// find the Snacks table (2nd recipe table) and print first data row cell HTML
const tables = [];
$('table').each((i, tb) => {
  const hdrs = [];
  $(tb).find('tr').first().find('th').each((j, th) => hdrs.push($(th).text().trim()));
  if (hdrs.some((h) => /ingredient/i.test(h))) tables.push(tb);
});

const $tb = $(tables[2]); // Snacks
console.log('=== categories present; dump first data <tr> ===');
const rows = $tb.find('tr').filter((i, tr) => $(tr).children('td').length > 0);
const first = $(rows[0]);
console.log('td count:', first.children('td').length);
first.children('td').each((i, td) => {
  console.log(`\n----- TD[${i}] outerHTML -----\n` + $(td).toString().slice(0, 800));
});