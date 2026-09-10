const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const html = fs.readFileSync(path.join(__dirname, '..', 'info', 'cooking_full.html'), 'utf8');
const $ = cheerio.load(html);

const headings = $('h2,h3,h4');
console.log('Total h2/h3/h4 nodes:', headings.length);
headings.each((i, h) => {
  const t = $(h).text().trim().replace(/\[edit.*/i, '');
  console.log(i, h.name, '|', t, '| tagparent:', $(h).parent()[0] && $(h).parent()[0].name, $(h).parent()[0] && $(h).parent()[0].attribs);
});
const recipesH2 = headings.filter((_, h) => $(h).text().includes('Recipes')).first();
console.log('recipesH2 idx check, text:', $(recipesH2).text().slice(0, 30));
const rootEl = recipesH2.parent();
console.log('rootEl tag:', rootEl[0].name, 'children count:', rootEl.children().length);
let counts = { h3: 0, h4: 0, table: 0 };
rootEl.children().each((i, node) => {
  if (!node.name) return;
  if (counts[node.name] != null) counts[node.name]++;
});
console.log('counts in root children:', counts);